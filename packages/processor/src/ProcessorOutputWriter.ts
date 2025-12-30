import type { OutputWriter, Batch } from './types.js';
import type { Processor } from './Processor.js';

/**
 * OutputWriter implementation that feeds output to another processor
 * instead of writing to disk. Used for chaining processors in a pipeline.
 */
export class ProcessorOutputWriter implements OutputWriter {
  private destinationProcessor: Processor;
  private destinationProcessorName: string;

  constructor(destinationProcessor: Processor, destinationProcessorName: string) {
    this.destinationProcessor = destinationProcessor;
    this.destinationProcessorName = destinationProcessorName;
  }

  /**
   * Feed the processed content to the destination processor as a new batch
   * The current processor's output is added to inputs with the batch name as key
   */
  async write(batch: Batch): Promise<void> {
    // Create new inputs: copy all original inputs + add this processor's output
    const newInputs: Record<string, string> = {
      ...batch.inputs,
      [batch.name]: batch.output ?? '',
    };

    // Create a new batch for the destination processor
    // File inputs (prefixed with "file:") are preserved in the inputs record
    const newBatch: Batch = {
      name: this.destinationProcessorName,
      inputs: newInputs,
      // Don't propagate lastProcessed - only the root processor tracks state
    };

    // Process through the destination processor
    await this.destinationProcessor.processBatch(newBatch);
  }
}

