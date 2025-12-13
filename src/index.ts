/**
 * Phylo - Config-driven AI file processor
 *
 * Library exports for programmatic usage
 */

// Core processor
export { Processor } from './lib/Processor.js';
export { ProcessorFactory } from './lib/ProcessorFactory.js';

// Configuration
export { ConfigManager } from './lib/ConfigManager.js';

// Default implementations
export { ConsoleLogger } from './lib/ConsoleLogger.js';
export { FileInputReader } from './lib/FileInputReader.js';
export { FileOutputWriter } from './lib/FileOutputWriter.js';
export { FilePromptProvider } from './lib/FilePromptProvider.js';

// Types
export type {
  Batch,
  InputReader,
  OutputWriter,
  PromptProvider,
  ProcessorConfig,
  Logger,
  FileInfo,
} from './lib/types.js';
