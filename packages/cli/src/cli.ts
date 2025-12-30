#!/usr/bin/env node
import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';
import {
  ConfigManager,
  ProcessorFactory,
  ConsoleLogger,
  type ProcessorConfig,
  type PipelineConfig,
} from '@phylo/processor';

// Load environment variables from .env file
dotenv.config();

/**
 * Generate a default config with all available options and placeholder API keys
 */
function generateDefaultConfig(): ProcessorConfig {
  return {
    input_folder: './input',
    output_folder: './output',
    prompt_files: [
      'prompts/base_instructions.md',
      'prompts/output_format.md',
    ],
    model: 'gpt-4o',
    max_batch_size: null,
    last_processed_file: null,
    input_file_pattern: '**/*.md',
    output_file_extension: '.md',
    env: {
      OPENAI_API_KEY: '',
      ANTHROPIC_API_KEY: '',
      GOOGLE_API_KEY: '',
      MISTRAL_API_KEY: '',
      GROQ_API_KEY: '',
      OPENROUTER_API_KEY: '',
      COHERE_API_KEY: '',
      TOGETHER_API_KEY: '',
      PERPLEXITY_API_KEY: '',
      FIREWORKS_API_KEY: '',
    },
  };
}

/**
 * Generate a pipeline config with chained processors
 */
function generatePipelineConfig(): PipelineConfig {
  return {
    input_folder: './input',
    max_batch_size: null,
    last_processed_file: null,
    input_file_pattern: '**/*.md',
    processors: {
      analysis: {
        prompt_files: ['prompts/analysis.md'],
        model: 'gpt-4o',
        output_processor: 'refinement',
      },
      refinement: {
        prompt_files: ['prompts/refinement.md'],
        model: 'gpt-4o',
        output_folder: './output',
        output_file_extension: '.md',
      },
    },
    env: {
      OPENAI_API_KEY: '',
      ANTHROPIC_API_KEY: '',
      GOOGLE_API_KEY: '',
      MISTRAL_API_KEY: '',
      GROQ_API_KEY: '',
      OPENROUTER_API_KEY: '',
      COHERE_API_KEY: '',
      TOGETHER_API_KEY: '',
      PERPLEXITY_API_KEY: '',
      FIREWORKS_API_KEY: '',
    },
  };
}

const program = new Command();

program
  .name('phylo')
  .description('Config-driven AI file processor for markdown files')
  .version('1.0.0');

program
  .option('-c, --config <path>', 'Path to JSON config file')
  .option('--init', 'Generate a single processor config file')
  .option('--init-pipeline', 'Generate a pipeline config file with chained processors')
  .action(async (options: { config?: string; init?: boolean; initPipeline?: boolean }) => {
    const logger = new ConsoleLogger();

    try {
      // Handle --init flag
      if (options.init) {
        const configPath = join(process.cwd(), 'phylo.config.json');

        if (existsSync(configPath)) {
          logger.error(`Config file already exists: ${configPath}`);
          process.exit(1);
        }

        const defaultConfig = generateDefaultConfig();
        await writeFile(configPath, JSON.stringify(defaultConfig, null, 2), {
          encoding: 'utf-8',
        });

        logger.success(`Created config file: ${configPath}`);
        logger.info('Edit the file to configure your input/output folders, prompts, and API keys.');
        return;
      }

      // Handle --init-pipeline flag
      if (options.initPipeline) {
        const configPath = join(process.cwd(), 'phylo.config.json');

        if (existsSync(configPath)) {
          logger.error(`Config file already exists: ${configPath}`);
          process.exit(1);
        }

        const pipelineConfig = generatePipelineConfig();
        await writeFile(configPath, JSON.stringify(pipelineConfig, null, 2), {
          encoding: 'utf-8',
        });

        logger.success(`Created pipeline config file: ${configPath}`);
        logger.info('Edit the file to configure your input folder, processors, prompts, and API keys.');
        logger.info('');
        logger.info('Pipeline processors:');
        logger.dim('  - "analysis" → processes input files and chains to "refinement"');
        logger.dim('  - "refinement" → refines output and writes to output folder');
        return;
      }

      // Process with config file
      if (!options.config) {
        logger.error('Error: --config <path> is required when not using --init or --init-pipeline');
        process.exit(1);
      }

      const configManager = await ConfigManager.load(options.config, logger);
      const processor = ProcessorFactory.create(configManager, logger);
      await processor.process();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error: ${errorMessage}`);
      process.exit(1);
    }
  });

program.parse();

