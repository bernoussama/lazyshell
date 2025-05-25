import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock the dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('os');
jest.mock('path');

// Import the function we want to test
// Since runCommand is not exported, we need to modify the original file or
// create a test-friendly version for this test
import { runCommand } from './utils';

describe('runCommand', () => {
  // Setup console spies
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let stdoutWriteSpy: jest.SpyInstance;
  let stderrWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup console spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
    stderrWriteSpy = jest.spyOn(process.stderr, 'write').mockImplementation();

    // Mock os.homedir
    (os.homedir as jest.Mock).mockReturnValue('/home/test');

    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    // Restore console spies
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
    stderrWriteSpy.mockRestore();
  });

  it('should execute the command and handle stdout correctly', () => {
    // Mock exec function
    const mockChildProcess = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
    };
    (childProcess.exec as unknown as jest.Mock).mockImplementation((cmd, callback) => {
      callback(null, 'command output', '');
      return mockChildProcess;
    });

    // Mock environment variables
    process.env.SHELL = '/bin/bash';

    // Call the function
    runCommand('ls -la');

    // Assertions
    expect(childProcess.exec).toHaveBeenCalledWith('ls -la', expect.any(Function));
    expect(fs.appendFileSync).toHaveBeenCalledWith('/home/test/.bash_history', 'ls -la\n');
    expect(consoleLogSpy).toHaveBeenCalledWith('');
    expect(mockChildProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
    expect(mockChildProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
  });
});
