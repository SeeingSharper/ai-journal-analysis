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
      output_folder: './output',
      prompt: 'Test prompt',
      model: 'gpt-4o',
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    const manager = await ConfigManager.load(configPath);

    expect(manager.inputFolder).toBe('./input');
    expect(manager.outputFolder).toBe('./output');
    expect(manager.model).toBe('gpt-4o');
  });

  it('should throw if input_folder is missing', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      output_folder: './output',
      prompt: 'Test prompt',
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    await expect(ConfigManager.load(configPath)).rejects.toThrow('input_folder');
  });

  it('should throw if output_folder is missing', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      input_folder: './input',
      prompt: 'Test prompt',
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    await expect(ConfigManager.load(configPath)).rejects.toThrow('output_folder');
  });

  it('should throw if no prompt is provided', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      input_folder: './input',
      output_folder: './output',
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    await expect(ConfigManager.load(configPath)).rejects.toThrow('prompt');
  });

  it('should accept prompt_file instead of prompt', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      input_folder: './input',
      output_folder: './output',
      prompt_file: './prompts/test.md',
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    const manager = await ConfigManager.load(configPath);
    expect(manager.getPromptValue()).toBe('./prompts/test.md');
  });

  it('should accept prompt_files instead of prompt', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      input_folder: './input',
      output_folder: './output',
      prompt_files: ['./prompts/a.md', './prompts/b.md'],
    };

    await writeFile(configPath, JSON.stringify(config), { encoding: 'utf-8' });

    const manager = await ConfigManager.load(configPath);
    expect(manager.getPromptValue()).toEqual(['./prompts/a.md', './prompts/b.md']);
  });

  it('should apply env variables from config', async () => {
    const configPath = join(TEST_DIR, 'config.json');
    const config = {
      input_folder: './input',
      output_folder: './output',
      prompt: 'Test',
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
});

