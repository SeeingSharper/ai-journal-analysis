import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { glob } from 'glob';
import type { InputReader, Batch, FileInfo } from './types.js';

/**
 * File-based implementation of InputReader
 * Reads markdown files from a folder and creates batches
 */
export class FileInputReader implements InputReader {
  private inputFolder: string;
  private lastProcessed: string | null;
  private batchSize: number;
  private filePattern: string;

  constructor(options: {
    inputFolder: string;
    lastProcessed?: string | null;
    batchSize?: number;
    filePattern?: string;
  }) {
    this.inputFolder = options.inputFolder;
    this.lastProcessed = options.lastProcessed ?? null;
    this.batchSize = options.batchSize ?? 1;
    this.filePattern = options.filePattern ?? '**/*.md';
  }

  /**
   * Read all input files and create batches
   */
  async read(): Promise<Batch[]> {
    const files = await this.getInputFiles();

    if (files.length === 0) {
      return [];
    }

    const batches: Batch[] = [];

    for (let i = 0; i < files.length; i += this.batchSize) {
      const batchFiles = files.slice(i, i + this.batchSize);
      const batch = await this.createBatch(batchFiles);
      batches.push(batch);
    }

    return batches;
  }

  /**
   * Get all input files sorted by modification time (oldest first)
   */
  private async getInputFiles(): Promise<string[]> {
    const pattern = resolve(this.inputFolder, this.filePattern);
    const files = await glob(pattern);

    // Get file info with modification times
    const fileInfos: FileInfo[] = [];
    for (const filePath of files) {
      const stats = await stat(filePath);
      fileInfos.push({
        path: filePath,
        mtime: stats.mtimeMs,
      });
    }

    // Sort by modification time (oldest first)
    fileInfos.sort((a, b) => a.mtime - b.mtime);

    // Convert to string paths
    let filePaths = fileInfos.map(f => f.path);

    // If there's a last processed file, only return files after it
    if (this.lastProcessed) {
      const lastIndex = filePaths.indexOf(this.lastProcessed);
      if (lastIndex !== -1) {
        filePaths = filePaths.slice(lastIndex + 1);
      }
    }

    return filePaths;
  }

  /**
   * Create a batch from a list of files
   */
  private async createBatch(filePaths: string[]): Promise<Batch> {
    // Build inputs record with file path as key, content as value
    const inputs: Record<string, string> = {};

    for (const filePath of filePaths) {
      const content = await readFile(filePath, { encoding: 'utf-8' });
      inputs[filePath] = content;
    }

    const name = this.generateBatchName(filePaths);
    const lastProcessed = filePaths[filePaths.length - 1];

    return {
      name,
      inputs,
      sourceFiles: filePaths,
      lastProcessed,
    };
  }

  /**
   * Generate a name for the batch based on source files
   */
  private generateBatchName(filePaths: string[]): string {
    if (filePaths.length === 0) {
      return 'output';
    }

    if (filePaths.length === 1) {
      const fileName = filePaths[0].split('/').pop() || 'output';
      return fileName.replace(/\.[^.]+$/, '');
    }

    // Use first and last filename stems for range
    const firstFileName = filePaths[0].split('/').pop() || '';
    const lastFileName = filePaths[filePaths.length - 1].split('/').pop() || '';
    const firstStem = firstFileName.replace(/\.[^.]+$/, '');
    const lastStem = lastFileName.replace(/\.[^.]+$/, '');

    return `${firstStem}_to_${lastStem}`;
  }
}

