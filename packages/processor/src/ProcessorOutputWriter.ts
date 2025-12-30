import type { OutputWriter, Batch } from './types.js';
import type { Processor } from './Processor.js';

/**
 * OutputWriter implementation that feeds output to another processor
 * instead of writing to disk. Used for chaining processors in a pipeline.
 */
export class ProcessorOutputWriter implements OutputWriter {
  private destinationProcessor: Processor;

  constructor(destinationProcessor: Processor) {
    this.destinationProcessor = destinationProcessor;
  }

  /**
   * Feed the processed content to the destination processor as a new batch
   * The current processor's output is added to the inputs array
   * The batch name is preserved throughout the pipeline
   */
  async write(batch: Batch): Promise<void> {
    // Create new inputs array: copy all original inputs + add this processor's output
    const newInputs = [...batch.inputs];
    if (batch.output) {
      newInputs.push(batch.output);
    }

    // Create a new batch for the destination processor
    // batch.name is preserved - it will be used for the final output filename
    const newBatch: Batch = {
      name: batch.name,
      inputs: newInputs,
      // Don't propagate lastProcessed - only the root processor tracks state
    };

    // Process through the destination processor
    await this.destinationProcessor.processBatch(newBatch);
  }
}
