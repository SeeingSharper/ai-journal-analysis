#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import { ConfigManager } from './ConfigManager.js';
import { ProcessorFactory } from './ProcessorFactory.js';
import { ConsoleLogger } from './ConsoleLogger.js';

// Load environment variables from .env file
dotenv.config();

const program = new Command();

program
  .name('phylo')
  .description('Config-driven AI file processor for markdown files')
  .version('1.0.0');

program
  .requiredOption('-c, --config <path>', 'Path to JSON config file')
  .action(async (options: { config: string }) => {
    const logger = new ConsoleLogger();

    try {
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
