import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleLogger } from '../src/ConsoleLogger.js';

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger = new ConsoleLogger();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should call console.log for info', () => {
    logger.info('test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should call console.log for success', () => {
    logger.success('test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should call console.log for warn', () => {
    logger.warn('test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should call console.error for error', () => {
    logger.error('test message');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should call console.log for dim', () => {
    logger.dim('test message');
    expect(consoleSpy).toHaveBeenCalled();
  });
});

