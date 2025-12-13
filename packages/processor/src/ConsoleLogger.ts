import chalk from 'chalk';
import type { Logger } from './types.js';

/**
 * Console-based implementation of Logger using chalk for colored output
 */
export class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(chalk.blue(message));
  }

  success(message: string): void {
    console.log(chalk.green(message));
  }

  warn(message: string): void {
    console.log(chalk.yellow(message));
  }

  error(message: string): void {
    console.error(chalk.red(message));
  }

  dim(message: string): void {
    console.log(chalk.dim(message));
  }
}

