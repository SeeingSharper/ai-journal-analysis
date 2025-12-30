import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { PromptProvider } from './types.js';

/**
 * File-based implementation of PromptProvider
 * Loads prompts from files, folders, or inline strings
 *
 * If the output folder matches a prompt source folder, caching is disabled
 * so that each call to getPrompt() reads fresh content from disk.
 */
export class FilePromptProvider implements PromptProvider {
  private promptSources: string | string[];
  private cachedPrompt: string | null = null;
  private shouldCache: boolean;

  constructor(options: {
    promptSources: string | string[];
    outputFolder?: string;
  }) {
    this.promptSources = options.promptSources;

    // Don't cache if output folder matches a prompt source (iterative prompting)
    this.shouldCache = !this.checkOutputMatchesPromptSource(options.outputFolder);
  }

  /**
   * Get the current prompt
   * If caching is disabled, always reads fresh from disk
   */
  async getPrompt(): Promise<string> {
    if (this.shouldCache && this.cachedPrompt !== null) {
      return this.cachedPrompt;
    }

    const prompt = await this.loadPrompt(this.promptSources);

    if (this.shouldCache) {
      this.cachedPrompt = prompt;
    }

    return prompt;
  }

  /**
   * Check if output folder matches any prompt source paths
   */
  private checkOutputMatchesPromptSource(outputFolder?: string): boolean {
    if (!outputFolder) return false;

    const outputPath = resolve(outputFolder);
    const promptPaths = Array.isArray(this.promptSources)
      ? this.promptSources
      : [this.promptSources];

    for (const promptPath of promptPaths) {
      try {
        const absPromptPath = resolve(promptPath);
        if (absPromptPath === outputPath) {
          return true;
        }
      } catch {
        // Ignore paths that can't be resolved
      }
    }

    return false;
  }

  /**
   * Load prompt(s) from sources
   */
  private async loadPrompt(sources: string | string[]): Promise<string> {
    if (Array.isArray(sources)) {
      const prompts: string[] = [];
      for (const source of sources) {
        const loaded = await this.loadSinglePrompt(source);
        if (loaded) {
          prompts.push(loaded);
        }
      }
      return prompts.join('\n\n');
    }

    return this.loadSinglePrompt(sources);
  }

  /**
   * Load a single prompt from a file, folder, or return as-is
   */
  private async loadSinglePrompt(promptOrFile: string): Promise<string> {
    try {
      const stats = await stat(promptOrFile);

      if (stats.isDirectory()) {
        return this.loadPromptsFromFolder(promptOrFile);
      }

      if (stats.isFile()) {
        const content = await readFile(promptOrFile, { encoding: 'utf-8' });
        return content.trim();
      }

      return promptOrFile;
    } catch {
      // If stat fails, treat it as a direct prompt string
      return promptOrFile;
    }
  }

  /**
   * Load and combine all prompts from a folder
   */
  private async loadPromptsFromFolder(folderPath: string): Promise<string> {
    const files = await readdir(folderPath);
    const mdFiles = files.filter(f => f.endsWith('.md')).sort();

    if (mdFiles.length === 0) {
      return '';
    }

    const prompts: string[] = [];
    for (const file of mdFiles) {
      const content = await readFile(join(folderPath, file), { encoding: 'utf-8' });
      prompts.push(content.trim());
    }

    return prompts.join('\n\n');
  }
}
