import type { InputReader, OutputWriter, PromptProvider, Batch, Logger, NamedContent } from './types.js';

// Lazy-loaded abso instance
let absoInstance: Awaited<typeof import('abso-ai')>['abso'] | null = null;

async function getAbso() {
  if (!absoInstance) {
    const { abso } = await import('abso-ai');
    absoInstance = abso;
  }
  return absoInstance;
}

const INPUT_SEPARATOR = '\n\n' + '='.repeat(80) + '\n\n';

/**
 * Estimate token count for content (rough approximation: ~4 chars per token)
 */
function estimateTokens(content: string, prompt: string): number {
  const totalChars = content.length + prompt.length;
  return Math.ceil(totalChars / 4);
}

/**
 * Format batch inputs into a single string for the AI
 */
function formatInputsForAI(inputs: NamedContent[]): string {
  const sections: string[] = [];

  for (const input of inputs) {
    sections.push(`Input: ${input.name}\n\n${input.content}`);
  }

  return sections.join(INPUT_SEPARATOR);
}

/**
 * Main processor class that orchestrates the processing pipeline
 */
export class Processor {
  private name: string;
  private inputReader: InputReader;
  private outputWriter: OutputWriter;
  private promptProvider: PromptProvider;
  private logger: Logger;
  private model: string;

  constructor(options: {
    name: string;
    inputReader: InputReader;
    outputWriter: OutputWriter;
    promptProvider: PromptProvider;
    logger: Logger;
    model?: string;
  }) {
    this.name = options.name;
    this.inputReader = options.inputReader;
    this.outputWriter = options.outputWriter;
    this.promptProvider = options.promptProvider;
    this.logger = options.logger;
    this.model = options.model ?? 'gpt-4o';
  }

  /**
   * Process all batches from the input reader
   */
  async process(): Promise<void> {
    // Read all batches
    const batches = await this.inputReader.read();

    if (batches.length === 0) {
      this.logger.warn('No new items to process.');
      return;
    }

    const totalInputs = batches.reduce((sum, b) => sum + b.inputs.length, 0);
    this.logger.info(`Found ${totalInputs} input(s) to process in ${batches.length} batch(es)`);

    // Process each batch
    for (const batch of batches) {
      this.logBatchStart(batch);

      try {
        await this.processBatch(batch);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const batchDesc = this.getBatchDescription(batch);
        this.logger.error(`✗ Error processing ${batchDesc}: ${errorMessage}`);
        // Don't continue on error, so we can retry from this batch next time
        break;
      }
    }

    this.logger.success('\nDone!');
  }

  /**
   * Process a single batch through AI and write output
   * This method can be called externally by ProcessorOutputWriter for chaining
   */
  async processBatch(batch: Batch): Promise<void> {
    // Get the prompt
    const prompt = await this.promptProvider.getPrompt();

    // Process the batch with AI and set the output on the batch
    const content = await this.processWithAI(batch, prompt);
    batch.output = {
      name: this.name,
      content,
    };

    // Write the output (either to file or to another processor)
    await this.outputWriter.write(batch);

    const batchDesc = this.getBatchDescription(batch);
    this.logger.success(`✓ Processed (${this.name}): ${batchDesc}`);
  }

  /**
   * Get a description of the batch for logging purposes
   */
  private getBatchDescription(batch: Batch): string {
    if (batch.inputs.length === 1) {
      return batch.inputs[0].name;
    }
    return `${batch.inputs.length} inputs`;
  }

  /**
   * Log the start of batch processing
   */
  private logBatchStart(batch: Batch): void {
    if (batch.inputs.length === 1) {
      this.logger.info(`\nProcessing (${this.name}): ${batch.inputs[0].name}`);
    } else {
      this.logger.info(`\nProcessing (${this.name}) batch of ${batch.inputs.length} inputs:`);
      for (const input of batch.inputs) {
        this.logger.dim(`  - ${input.name}`);
      }
    }
  }

  /**
   * Process a batch with the AI model
   */
  private async processWithAI(batch: Batch, prompt: string): Promise<string> {
    // Format all inputs into a single string for the AI
    const formattedInputs = formatInputsForAI(batch.inputs);

    // Estimate and log token usage
    const estimatedTokens = estimateTokens(formattedInputs, prompt);
    this.logger.dim(`  → Estimated tokens: ${estimatedTokens.toLocaleString()}`);

    // Use abso-ai to process the content
    const abso = await getAbso();
    const response = await abso.chat.create({
      model: this.model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: formattedInputs },
      ],
    });

    return response.choices[0]?.message?.content || '';
  }
}
