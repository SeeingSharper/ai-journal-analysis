import type { InputReader, OutputWriter, PromptProvider, Batch, Logger } from './types.js';

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
function formatInputsForAI(inputs: Record<string, string>): string {
  const sections: string[] = [];

  for (const [key, content] of Object.entries(inputs)) {
    sections.push(`Input: ${key}\n\n${content}`);
  }

  return sections.join(INPUT_SEPARATOR);
}

/**
 * Main processor class that orchestrates the processing pipeline
 */
export class Processor {
  private inputReader: InputReader;
  private outputWriter: OutputWriter;
  private promptProvider: PromptProvider;
  private logger: Logger;
  private model: string;

  constructor(options: {
    inputReader: InputReader;
    outputWriter: OutputWriter;
    promptProvider: PromptProvider;
    logger: Logger;
    model?: string;
  }) {
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
    // Check if we need to reload prompts after each batch
    const reloadPrompts = this.promptProvider.shouldReload();

    if (reloadPrompts) {
      this.logger.info('Iterative prompting enabled: Output folder matches a prompt folder');
      this.logger.info('Prompts will be reloaded after each batch to include previous outputs\n');
    }

    // Read all batches
    const batches = await this.inputReader.read();

    if (batches.length === 0) {
      this.logger.warn('No new items to process.');
      return;
    }

    const totalFiles = batches.reduce((sum, b) => sum + b.sourceFiles.length, 0);
    this.logger.info(`Found ${totalFiles} item(s) to process in ${batches.length} batch(es)`);

    // Process each batch
    for (const batch of batches) {
      this.logBatchStart(batch);

      try {
        await this.processBatch(batch);

        // Reload prompts if needed
        if (reloadPrompts) {
          await this.promptProvider.reload();
          this.logger.info('  ↻ Prompts reloaded to include new outputs');
        }
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
    batch.output = await this.processWithAI(batch, prompt);

    // Write the output (either to file or to another processor)
    await this.outputWriter.write(batch);

    this.logger.success(`✓ Completed: ${batch.name}`);
  }

  /**
   * Log the start of batch processing
   */
  private logBatchStart(batch: Batch): void {
    if (batch.sourceFiles.length === 1) {
      this.logger.info(`\nProcessing: ${batch.sourceFiles[0]}`);
    } else {
      this.logger.info(`\nProcessing batch of ${batch.sourceFiles.length} files:`);
      for (const filePath of batch.sourceFiles) {
        this.logger.dim(`  - ${filePath}`);
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

