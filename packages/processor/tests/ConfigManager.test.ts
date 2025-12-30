import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ConfigManager } from '../src/ConfigManager.js';

const TEST_DIR = join(process.cwd(), 'test-fixtures');

describe('ConfigManager', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('should load a valid config file', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      input_folder: './input',
      processors: {
        main: {
          prompt: 'Test prompt',
          model: 'gpt-4o',
          output_folder: './output',
        },
      },
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    const manager = await ConfigManager.load(configPath);

    expect(manager.inputFolder).toBe('./input');
    expect(manager.getEntryProcessorName()).toBe('main');
    expect(manager.getProcessorConfig('main').model).toBe('gpt-4o');
  });

  it('should throw if input_folder is missing', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      processors: {
        main: {
          prompt: 'Test prompt',
          output_folder: './output',
        },
      },
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    await expect(ConfigManager.load(configPath)).rejects.toThrow('input_folder');
  });

  it('should throw if processors is missing', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      input_folder: './input',
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    await expect(ConfigManager.load(configPath)).rejects.toThrow('processors');
  });

  it('should throw if processor has no prompt', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      input_folder: './input',
      processors: {
        main: {
          output_folder: './output',
        },
      },
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    await expect(ConfigManager.load(configPath)).rejects.toThrow('prompt');
  });

  it('should accept prompt_file instead of prompt', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      input_folder: './input',
      processors: {
        main: {
          prompt_file: './prompts/test.md',
          output_folder: './output',
        },
      },
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    const manager = await ConfigManager.load(configPath);
    expect(manager.getProcessorConfig('main').prompt_file).toBe('./prompts/test.md');
  });

  it('should accept prompt_files instead of prompt', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      input_folder: './input',
      processors: {
        main: {
          prompt_files: ['./prompts/a.md', './prompts/b.md'],
          output_folder: './output',
        },
      },
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    const manager = await ConfigManager.load(configPath);
    expect(manager.getProcessorConfig('main').prompt_files).toEqual(['./prompts/a.md', './prompts/b.md']);
  });

  it('should apply env variables from config', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      input_folder: './input',
      processors: {
        main: {
          prompt: 'Test',
          output_folder: './output',
        },
      },
      env: {
        TEST_API_KEY: 'test-key-123',
      },
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    await ConfigManager.load(configPath);
    expect(process.env.TEST_API_KEY).toBe('test-key-123');

    // Clean up
    delete process.env.TEST_API_KEY;
  });

  it('should validate processor chain correctly', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      input_folder: './input',
      processors: {
        analysis: {
          prompt: 'Analyze',
          output_processor: 'refinement',
        },
        refinement: {
          prompt: 'Refine',
          output_folder: './output',
        },
      },
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    const manager = await ConfigManager.load(configPath);
    expect(manager.getEntryProcessorName()).toBe('analysis');
  });

  it('should throw if processor references unknown processor', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      input_folder: './input',
      processors: {
        main: {
          prompt: 'Test',
          output_processor: 'nonexistent',
        },
      },
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    await expect(ConfigManager.load(configPath)).rejects.toThrow('nonexistent');
  });
});
