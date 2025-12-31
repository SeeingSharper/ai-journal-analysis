import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getFilesFromInputs, generateOutputName } from './types.js';
import type { OutputWriter, Batch } from './types.js';
import type { ConfigManager } from './ConfigManager.js';

/**
 * File-based implementation of OutputWriter
 * Writes output to files and persists state to config
 */
export class FileOutputWriter implements OutputWriter {
  private outputFolder: string;
  private configManager: ConfigManager | null;
  private fileExtension: string;

  constructor(options: {
    outputFolder: string;
    configManager?: ConfigManager;
    fileExtension?: string;
  }) {
    this.outputFolder = options.outputFolder;
    this.configManager = options.configManager ?? null;
    this.fileExtension = options.fileExtension ?? '.md';
  }

  /**
   * Write the processed content and update state
   */
  async write(batch: Batch): Promise<void> {
    // Create output directory if it doesn't exist
    await mkdir(this.outputFolder, { recursive: true });

    // Generate output filename from the file inputs
    const filePaths = getFilesFromInputs(batch.inputs);
    const outputName = generateOutputName(filePaths);
    const outputFilename = `${outputName}${this.fileExtension}`;
    const outputPath = join(this.outputFolder, outputFilename);

    // Save the output content (use batch.output.content or empty string if not set)
    await writeFile(outputPath, batch.output?.content ?? '', { encoding: 'utf-8' });

    // Update and save config state if configManager is provided
    if (this.configManager && batch.lastProcessed) {
      this.configManager.updateLastProcessed(batch.lastProcessed);
      await this.configManager.save();
    }
  }
}
