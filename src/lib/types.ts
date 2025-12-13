/**
 * Represents a batch of content to be processed
 */
export interface Batch {
  /** Name identifier for the batch (used for output filename) */
  name: string;
  /** Combined content of the batch */
  content: string;
  /** Source files that make up this batch */
  sourceFiles: string[];
  /** Path to the last processed file (for state tracking) */
  lastProcessed?: string;
}

/**
 * Interface for reading input and creating batches
 */
export interface InputReader {
  /**
   * Read input sources and return batches ready for processing
   */
  read(): Promise<Batch[]>;
}

/**
 * Interface for writing processed output
 */
export interface OutputWriter {
  /**
   * Write the processed content for a batch
   * Also handles persisting state (lastProcessed) if provided
   * @param batch - The original batch that was processed
   * @param content - The AI-generated content to write
   */
  write(batch: Batch, content: string): Promise<void>;
}

/**
 * Interface for providing prompts to the processor
 */
export interface PromptProvider {
  /**
   * Get the current prompt
   */
  getPrompt(): Promise<string>;

  /**
   * Reload the prompt (for iterative prompting scenarios)
   */
  reload(): Promise<void>;

  /**
   * Check if prompts should be reloaded after each batch
   */
  shouldReload(): boolean;
}

/**
 * Configuration interface for the processor
 */
export interface ProcessorConfig {
  /** Path to folder containing markdown files to process */
  input_folder: string;
  /** Where to save AI-generated outputs */
  output_folder: string;
  /** Inline prompt string */
  prompt?: string;
  /** Single file path containing the prompt */
  prompt_file?: string;
  /** Array of prompts/files to combine */
  prompt_files?: string[];
  /** AI model to use (default: gpt-4o) */
  model?: string;
  /** Number of files to concatenate and send together in a single AI request */
  max_batch_size?: number | null;
  /** Path to the last successfully processed file (auto-managed) */
  last_processed_file?: string | null;
  /** Glob pattern for filtering input files (default: all .md files) */
  input_file_pattern?: string;
  /** File extension for output files (default: .md) */
  output_file_extension?: string;
  /** Environment variables (API keys) - takes priority over .env */
  env?: Record<string, string>;
}

/**
 * Interface for logging messages
 */
export interface Logger {
  /**
   * Log an informational message
   */
  info(message: string): void;

  /**
   * Log a success message
   */
  success(message: string): void;

  /**
   * Log a warning message
   */
  warn(message: string): void;

  /**
   * Log an error message
   */
  error(message: string): void;

  /**
   * Log a dimmed/secondary message
   */
  dim(message: string): void;
}

/**
 * File info with modification time (internal use)
 */
export interface FileInfo {
  /** Absolute path to the file */
  path: string;
  /** Modification time in milliseconds */
  mtime: number;
}

