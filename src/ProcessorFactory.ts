import type { Logger } from './types.js';
import type { ConfigManager } from './ConfigManager.js';
import { FileInputReader } from './FileInputReader.js';
import { FileOutputWriter } from './FileOutputWriter.js';
import { FilePromptProvider } from './FilePromptProvider.js';
import { Processor } from './Processor.js';

/**
 * Factory for creating Processor instances with all dependencies wired up
 */
export class ProcessorFactory {
  /**
   * Create a Processor instance from configuration
   * @param configManager - The configuration manager
   * @param logger - Logger instance
   * @returns A fully configured Processor instance
   */
  static create(configManager: ConfigManager, logger: Logger): Processor {
    // Create the input reader
    const inputReader = new FileInputReader({
      inputFolder: configManager.inputFolder,
      lastProcessed: configManager.lastProcessed,
      batchSize: configManager.batchSize ?? 1,
      filePattern: configManager.inputFilePattern,
    });

    // Create the output writer
    const outputWriter = new FileOutputWriter({
      outputFolder: configManager.outputFolder,
      configManager,
      fileExtension: configManager.outputFileExtension,
    });

    // Create the prompt provider
    const promptProvider = new FilePromptProvider({
      promptSources: configManager.getPromptValue(),
      outputFolder: configManager.outputFolder,
    });

    // Create and return the processor
    return new Processor({
      inputReader,
      outputWriter,
      promptProvider,
      logger,
      model: configManager.model,
    });
  }
}

