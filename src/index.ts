/**
 * Phylo - Config-driven AI file processor
 *
 * Library exports for programmatic usage
 */

// Core processor
export { Processor } from './Processor.js';
export { ProcessorFactory } from './ProcessorFactory.js';

// Configuration
export { ConfigManager } from './ConfigManager.js';

// Default implementations
export { ConsoleLogger } from './ConsoleLogger.js';
export { FileInputReader } from './FileInputReader.js';
export { FileOutputWriter } from './FileOutputWriter.js';
export { FilePromptProvider } from './FilePromptProvider.js';

// Types
export type {
  Batch,
  InputReader,
  OutputWriter,
  PromptProvider,
  ProcessorConfig,
  Logger,
  FileInfo,
} from './types.js';
