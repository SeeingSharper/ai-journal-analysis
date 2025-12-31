/**
 * Prefix for file-based inputs
 * File inputs have names like "file:/path/to/file.md"
 */
export const FILE_INPUT_PREFIX = 'file:';

/**
 * A named piece of content (input or output)
 */
export interface NamedContent {
  /** Identifier: file path (with "file:" prefix) or processor name */
  name: string;
  /** The actual content */
  content: string;
}

/**
 * Extract file paths from batch inputs (names starting with "file:")
 */
export function getFilesFromInputs(inputs: NamedContent[]): string[] {
  return inputs
    .filter(input => input.name.startsWith(FILE_INPUT_PREFIX))
    .map(input => input.name.slice(FILE_INPUT_PREFIX.length));
}

/**
 * Generate an output name from file paths (for file-based outputs)
 * Used by FileOutputWriter to determine the output filename
 */
export function generateOutputName(filePaths: string[]): string {
  if (filePaths.length === 0) {
    return 'output';
  }

  if (filePaths.length === 1) {
    const fileName = filePaths[0].split('/').pop() || 'output';
    return fileName.replace(/\.[^.]+$/, '');
  }

  // Use first and last filename stems for range
  const firstFileName = filePaths[0].split('/').pop() || '';
  const lastFileName = filePaths[filePaths.length - 1].split('/').pop() || '';
  const firstStem = firstFileName.replace(/\.[^.]+$/, '');
  const lastStem = lastFileName.replace(/\.[^.]+$/, '');

  return `${firstStem}_to_${lastStem}`;
}

/**
 * Represents a batch of content to be processed
 */
export interface Batch {
  /** Array of named inputs: file contents or processor outputs */
  inputs: NamedContent[];
  /** The processor's output with its name (processor name that created it) */
  output?: NamedContent;
  /** Metadata for state tracking (e.g., last processed file path) */
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
   * Implementations handle caching internally as appropriate
   */
  getPrompt(): Promise<string>;
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
 * Configuration for the processor with named processing steps
 */
export interface ProcessorConfig {
  /** Path to folder containing markdown files to process */
  input_folder: string;
  /** Named processors (can be single or chained) */
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

