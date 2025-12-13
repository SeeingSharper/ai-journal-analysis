import { readFile, writeFile } from 'node:fs/promises';
import type { ProcessorConfig, Logger } from './types.js';

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
    if (!config.output_folder) {
      throw new Error('Config must contain "output_folder"');
    }
    if (!config.prompt && !config.prompt_file && !config.prompt_files) {
      throw new Error('Config must contain "prompt", "prompt_file", or "prompt_files"');
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
   * Get the full configuration
   */
  getConfig(): ProcessorConfig {
    return this.config;
  }

  /**
   * Get the prompt value from config (handles all three formats)
   */
  getPromptValue(): string | string[] {
    if (this.config.prompt_files) {
      return this.config.prompt_files;
    }
    if (this.config.prompt_file) {
      return this.config.prompt_file;
    }
    return this.config.prompt || '';
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
   * Get output folder path
   */
  get outputFolder(): string {
    return this.config.output_folder;
  }

  /**
   * Get the AI model
   */
  get model(): string | undefined {
    return this.config.model;
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
   * Get the output file extension
   */
  get outputFileExtension(): string | undefined {
    return this.config.output_file_extension;
  }
}

