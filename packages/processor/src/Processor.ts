import { getFilesFromInputs } from './types.js';
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

    const totalFiles = batches.reduce((sum, b) => sum + getFilesFromInputs(b.inputs).length, 0);
    this.logger.info(`Found ${totalFiles} item(s) to process in ${batches.length} batch(es)`);

    // Process each batch
    for (const batch of batches) {
      this.logBatchStart(batch);

      try {
        await this.processBatch(batch);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`✗ Error processing ${batch.name}: ${errorMessage}`);
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

    this.logger.success(`✓ Completed: ${batch.name}`);
  }

  /**
   * Log the start of batch processing
   */
  private logBatchStart(batch: Batch): void {
    const files = getFilesFromInputs(batch.inputs);

    if (files.length === 1) {
      this.logger.info(`\nProcessing: ${files[0]}`);
    } else if (files.length > 1) {
      this.logger.info(`\nProcessing batch of ${files.length} files:`);
      for (const filePath of files) {
        this.logger.dim(`  - ${filePath}`);
      }
    } else {
      // No file inputs (e.g., downstream processor receiving from upstream)
      this.logger.info(`\nProcessing: ${batch.name}`);
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

