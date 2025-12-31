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
   */
  async write(batch: Batch): Promise<void> {
    // Create new inputs array: copy all original inputs + add this processor's output
    const newInputs = [...batch.inputs];
    if (batch.output) {
      newInputs.push(batch.output);
    }

    // Create a new batch for the destination processor
    const newBatch: Batch = {
      inputs: newInputs,
      lastProcessed: batch.lastProcessed,
    };

    // Feed the new batch to the destination processor
    await this.destinationProcessor.processBatch(newBatch);
  }
}
