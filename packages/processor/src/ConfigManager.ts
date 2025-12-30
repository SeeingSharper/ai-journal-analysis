import { readFile, writeFile } from 'node:fs/promises';
import type { ProcessorConfig, PipelineConfig, NamedProcessorConfig, Logger } from './types.js';

/**
 * Type guard to check if config is a pipeline config
 */
function isPipelineConfig(config: ProcessorConfig | PipelineConfig): config is PipelineConfig {
  return 'processors' in config && typeof config.processors === 'object';
}

/**
 * Manages configuration loading, validation, and state persistence
 */
export class ConfigManager {
  private config: ProcessorConfig | PipelineConfig;
  private configPath: string;
  private logger: Logger | null;
  private _isPipeline: boolean;

  private constructor(config: ProcessorConfig | PipelineConfig, configPath: string, logger?: Logger) {
    this.config = config;
    this.configPath = configPath;
    this.logger = logger ?? null;
    this._isPipeline = isPipelineConfig(config);
  }

  /**
   * Load and validate configuration from a file
   */
  static async load(configPath: string, logger?: Logger): Promise<ConfigManager> {
    const content = await readFile(configPath, { encoding: 'utf-8' });
    const config = JSON.parse(content) as ProcessorConfig | PipelineConfig;

    // Validate required fields
    if (!config.input_folder) {
      throw new Error('Config must contain "input_folder"');
    }

    // Check if this is a pipeline config
    if (isPipelineConfig(config)) {
      // Validate pipeline config
      ConfigManager.validatePipelineConfig(config);
    } else {
      // Validate single processor config
      if (!config.output_folder) {
        throw new Error('Config must contain "output_folder"');
      }
      if (!config.prompt && !config.prompt_file && !config.prompt_files) {
        throw new Error('Config must contain "prompt", "prompt_file", or "prompt_files"');
      }
    }

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
   * Validate a pipeline configuration
   */
  private static validatePipelineConfig(config: PipelineConfig): void {
    const processorNames = Object.keys(config.processors);

    if (processorNames.length === 0) {
      throw new Error('Pipeline config must have at least one processor');
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
      throw new Error('Pipeline has a circular reference - no entry processor found');
    }

    if (entryProcessors.length > 1) {
      throw new Error(`Pipeline has multiple entry processors: ${entryProcessors.join(', ')}. Only one entry processor is supported.`);
    }
  }

  /**
   * Get the full configuration
   */
  getConfig(): ProcessorConfig | PipelineConfig {
    return this.config;
  }

  /**
   * Check if this is a pipeline configuration
   */
  get isPipeline(): boolean {
    return this._isPipeline;
  }

  /**
   * Get the pipeline config (only valid if isPipeline is true)
   */
  getPipelineConfig(): PipelineConfig {
    if (!this._isPipeline) {
      throw new Error('Config is not a pipeline configuration');
    }
    return this.config as PipelineConfig;
  }

  /**
   * Get the entry processor name for a pipeline
   * (the processor that is not referenced by any other processor)
   */
  getEntryProcessorName(): string {
    if (!this._isPipeline) {
      throw new Error('Config is not a pipeline configuration');
    }

    const pipelineConfig = this.config as PipelineConfig;
    const processorNames = Object.keys(pipelineConfig.processors);

    // Find which processors are referenced by others
    const referencedProcessors = new Set<string>();
    for (const processor of Object.values(pipelineConfig.processors)) {
      if (processor.output_processor) {
        referencedProcessors.add(processor.output_processor);
      }
    }

    // Entry processor is the one not referenced by anyone
    const entryProcessors = processorNames.filter(name => !referencedProcessors.has(name));
    return entryProcessors[0];
  }

  /**
   * Get a named processor config from the pipeline
   */
  getProcessorConfig(name: string): NamedProcessorConfig {
    if (!this._isPipeline) {
      throw new Error('Config is not a pipeline configuration');
    }

    const pipelineConfig = this.config as PipelineConfig;
    const processor = pipelineConfig.processors[name];

    if (!processor) {
      throw new Error(`Processor "${name}" not found in pipeline`);
    }

    return processor;
  }

  /**
   * Get the prompt value from config (handles all three formats)
   * Only valid for single processor configs
   */
  getPromptValue(): string | string[] {
    if (this._isPipeline) {
      throw new Error('getPromptValue() is not available for pipeline configs');
    }
    const config = this.config as ProcessorConfig;
    if (config.prompt_files) {
      return config.prompt_files;
    }
    if (config.prompt_file) {
      return config.prompt_file;
    }
    return config.prompt || '';
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
   * Get output folder path (only valid for single processor configs)
   */
  get outputFolder(): string {
    if (this._isPipeline) {
      throw new Error('outputFolder is not available for pipeline configs');
    }
    return (this.config as ProcessorConfig).output_folder;
  }

  /**
   * Get the AI model (only valid for single processor configs)
   */
  get model(): string | undefined {
    if (this._isPipeline) {
      throw new Error('model is not available for pipeline configs');
    }
    return (this.config as ProcessorConfig).model;
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

  /**
   * Get the output file extension (only valid for single processor configs)
   */
  get outputFileExtension(): string | undefined {
    if (this._isPipeline) {
      throw new Error('outputFileExtension is not available for pipeline configs');
    }
    return (this.config as ProcessorConfig).output_file_extension;
  }
}

