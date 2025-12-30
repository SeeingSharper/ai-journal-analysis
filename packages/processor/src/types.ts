/**
 * Represents a batch of content to be processed
 */
export interface Batch {
  /** Name identifier for the batch (used for output filename and as input key for downstream processors) */
  name: string;
  /** Named inputs: file paths or processor names mapped to their content */
  inputs: Record<string, string>;
  /** The processor's output (set after processing) */
  output?: string;
  /** Source files that make up this batch (for tracking original files) */
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
   * Write the processed output for a batch
   * The output is available in batch.output
   * Also handles persisting state (lastProcessed) if provided
   * @param batch - The batch with output set
   */
  write(batch: Batch): Promise<void>;
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

/**
 * Configuration for a named processor in a pipeline
 */
export interface NamedProcessorConfig {
  /** Inline prompt string */
  prompt?: string;
  /** Single file path containing the prompt */
  prompt_file?: string;
  /** Array of prompts/files to combine */
  prompt_files?: string[];
  /** AI model to use (default: gpt-4o) */
  model?: string;
  /** Name of another processor to chain output to */
  output_processor?: string;
  /** Where to save AI-generated outputs (terminal output) */
  output_folder?: string;
  /** File extension for output files (default: .md) */
  output_file_extension?: string;
}

/**
 * Configuration for a processing pipeline with multiple chained processors
 */
export interface PipelineConfig {
  /** Path to folder containing markdown files to process */
  input_folder: string;
  /** Named processors in the pipeline */
  processors: Record<string, NamedProcessorConfig>;
  /** Number of files to concatenate and send together in a single AI request */
  max_batch_size?: number | null;
  /** Path to the last successfully processed file (auto-managed) */
  last_processed_file?: string | null;
  /** Glob pattern for filtering input files (default: all .md files) */
  input_file_pattern?: string;
  /** Environment variables (API keys) - takes priority over .env */
  env?: Record<string, string>;
}

