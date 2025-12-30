import { readFile, writeFile } from 'node:fs/promises';
import type { ProcessorConfig, NamedProcessorConfig, Logger } from './types.js';

/**
 * Manages configuration loading, validation, and state persistence
 */
export class ConfigManager {
  private config: ProcessorConfig;
  private configPath: string;
  private logger: Logger | null;

  private constructor(config: ProcessorConfig, configPath: string, logger?: Logger) {
    this.config = config;
    this.configPath = configPath;
    this.logger = logger ?? null;
  }

  /**
   * Load and validate configuration from a file
   */
  static async load(configPath: string, logger?: Logger): Promise<ConfigManager> {
    const content = await readFile(configPath, { encoding: 'utf-8' });
    const config = JSON.parse(content) as ProcessorConfig;

    // Validate required fields
    if (!config.input_folder) {
      throw new Error('Config must contain "input_folder"');
    }

    if (!config.processors) {
      throw new Error('Config must contain "processors"');
    }

    // Validate the config
    ConfigManager.validateConfig(config);

    // Apply environment variables from config (takes priority over existing)
    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        if (value) {
          process.env[key] = value;
        }
      }
    }

    return new ConfigManager(config, configPath, logger);
  }

  /**
   * Validate a processor configuration
   */
  private static validateConfig(config: ProcessorConfig): void {
    const processorNames = Object.keys(config.processors);

    if (processorNames.length === 0) {
      throw new Error('Config must have at least one processor');
    }

    // Track which processors are referenced as outputs
    const referencedProcessors = new Set<string>();

    for (const [name, processor] of Object.entries(config.processors)) {
      // Each processor must have a prompt
      if (!processor.prompt && !processor.prompt_file && !processor.prompt_files) {
        throw new Error(`Processor "${name}" must have "prompt", "prompt_file", or "prompt_files"`);
      }

      // Each processor must have exactly one output (output_processor or output_folder)
      const hasOutputProcessor = !!processor.output_processor;
      const hasOutputFolder = !!processor.output_folder;

      if (!hasOutputProcessor && !hasOutputFolder) {
        throw new Error(`Processor "${name}" must have either "output_processor" or "output_folder"`);
      }

      if (hasOutputProcessor && hasOutputFolder) {
        throw new Error(`Processor "${name}" cannot have both "output_processor" and "output_folder"`);
      }

      // Validate output_processor reference
      if (processor.output_processor) {
        if (!processorNames.includes(processor.output_processor)) {
          throw new Error(`Processor "${name}" references unknown processor "${processor.output_processor}"`);
        }
        if (processor.output_processor === name) {
          throw new Error(`Processor "${name}" cannot reference itself`);
        }
        referencedProcessors.add(processor.output_processor);
      }
    }

    // Find the entry processor (not referenced by any other processor)
    const entryProcessors = processorNames.filter(name => !referencedProcessors.has(name));

    if (entryProcessors.length === 0) {
      throw new Error('Config has a circular reference - no entry processor found');
    }

    if (entryProcessors.length > 1) {
      throw new Error(`Config has multiple entry processors: ${entryProcessors.join(', ')}. Only one entry processor is supported.`);
    }
  }

  /**
   * Get the full configuration
   */
  getConfig(): ProcessorConfig {
    return this.config;
  }

  /**
   * Get the entry processor name
   * (the processor that is not referenced by any other processor)
   */
  getEntryProcessorName(): string {
    const processorNames = Object.keys(this.config.processors);

    // Find which processors are referenced by others
    const referencedProcessors = new Set<string>();
    for (const processor of Object.values(this.config.processors)) {
      if (processor.output_processor) {
        referencedProcessors.add(processor.output_processor);
      }
    }

    // Entry processor is the one not referenced by anyone
    const entryProcessors = processorNames.filter(name => !referencedProcessors.has(name));
    return entryProcessors[0];
  }

  /**
   * Get a named processor config
   */
  getProcessorConfig(name: string): NamedProcessorConfig {
    const processor = this.config.processors[name];

    if (!processor) {
      throw new Error(`Processor "${name}" not found in config`);
    }

    return processor;
  }

  /**
   * Update the last processed file
   */
  updateLastProcessed(filePath: string): void {
    this.config.last_processed_file = filePath;
  }

  /**
   * Save the current configuration state back to disk
   */
  async save(): Promise<void> {
    try {
      const content = JSON.stringify(this.config, null, 2);
      await writeFile(this.configPath, content, { encoding: 'utf-8' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (this.logger) {
        this.logger.warn(`Warning: Failed to save config: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Get input folder path
   */
  get inputFolder(): string {
    return this.config.input_folder;
  }

  /**
   * Get the batch size
   */
  get batchSize(): number | null | undefined {
    return this.config.max_batch_size;
  }

  /**
   * Get the last processed file
   */
  get lastProcessed(): string | null | undefined {
    return this.config.last_processed_file;
  }

  /**
   * Get the input file pattern
   */
  get inputFilePattern(): string | undefined {
    return this.config.input_file_pattern;
  }
}
