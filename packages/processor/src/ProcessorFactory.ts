import type { Logger, NamedProcessorConfig, OutputWriter } from './types.js';
import type { ConfigManager } from './ConfigManager.js';
import { FileInputReader } from './FileInputReader.js';
import { FileOutputWriter } from './FileOutputWriter.js';
import { FilePromptProvider } from './FilePromptProvider.js';
import { ProcessorOutputWriter } from './ProcessorOutputWriter.js';
import { Processor } from './Processor.js';

/**
 * Factory for creating Processor instances with all dependencies wired up
 */
export class ProcessorFactory {
  /**
   * Create a Processor instance from configuration
   * @param configManager - The configuration manager
   * @param logger - Logger instance
   * @returns A fully configured Processor instance (entry processor)
   */
  static create(configManager: ConfigManager, logger: Logger): Processor {
    const config = configManager.getConfig();
    const entryName = configManager.getEntryProcessorName();

    // Only show pipeline info if there are multiple processors
    const processorNames = Object.keys(config.processors);
    if (processorNames.length > 1) {
      logger.info(`Building pipeline starting from "${entryName}"...`);
    }

    // Build processors in order from terminal (end) to entry (start)
    // This way we can wire up ProcessorOutputWriter with the destination processor
    const processorOrder = ProcessorFactory.getProcessorOrder(configManager, entryName);
    const processors = new Map<string, Processor>();

    // Create processors in reverse order (terminal first)
    for (const name of processorOrder.reverse()) {
      const processorConfig = configManager.getProcessorConfig(name);
      const isEntry = name === entryName;

      // Determine the output writer
      let outputWriter: OutputWriter;
      if (processorConfig.output_folder) {
        // Terminal processor - writes to file
        outputWriter = new FileOutputWriter({
          outputFolder: processorConfig.output_folder,
          configManager: isEntry ? configManager : undefined,
          fileExtension: processorConfig.output_file_extension,
        });
      } else if (processorConfig.output_processor) {
        // Intermediate processor - chains to another processor
        const destinationProcessor = processors.get(processorConfig.output_processor);
        if (!destinationProcessor) {
          throw new Error(`Destination processor "${processorConfig.output_processor}" not found`);
        }
        outputWriter = new ProcessorOutputWriter(destinationProcessor, processorConfig.output_processor);
      } else {
        throw new Error(`Processor "${name}" has no output configured`);
      }

      // Create prompt provider
      const promptProvider = new FilePromptProvider({
        promptSources: ProcessorFactory.getPromptSources(processorConfig),
        outputFolder: processorConfig.output_folder,
      });

      // Create the processor
      const processor = new Processor({
        inputReader: isEntry
          ? new FileInputReader({
              inputFolder: config.input_folder,
              lastProcessed: config.last_processed_file,
              batchSize: config.max_batch_size ?? 1,
              filePattern: config.input_file_pattern,
            })
          : new NoOpInputReader(), // Non-entry processors don't read from files
        outputWriter,
        promptProvider,
        logger,
        model: processorConfig.model,
      });

      processors.set(name, processor);

      if (processorNames.length > 1) {
        logger.dim(`  → Created processor "${name}"`);
      }
    }

    // Return the entry processor
    const entryProcessor = processors.get(entryName);
    if (!entryProcessor) {
      throw new Error('Failed to create entry processor');
    }

    if (processorNames.length > 1) {
      logger.info('');
    }

    return entryProcessor;
  }

  /**
   * Get the order of processors from entry to terminal
   */
  private static getProcessorOrder(configManager: ConfigManager, entryName: string): string[] {
    const order: string[] = [];
    let currentName: string | undefined = entryName;

    while (currentName) {
      order.push(currentName);
      const processor = configManager.getProcessorConfig(currentName);
      currentName = processor.output_processor;
    }

    return order;
  }

  /**
   * Get prompt sources from a named processor config
   */
  private static getPromptSources(config: NamedProcessorConfig): string | string[] {
    if (config.prompt_files) {
      return config.prompt_files;
    }
    if (config.prompt_file) {
      return config.prompt_file;
    }
    return config.prompt || '';
  }
}

/**
 * No-op input reader for non-entry processors.
 * These processors receive their input via ProcessorOutputWriter, not from files.
 */
class NoOpInputReader {
  async read() {
    return [];
  }
}
