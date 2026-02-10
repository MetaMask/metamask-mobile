/* eslint-disable import/no-nodejs-modules */
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
/* eslint-enable import/no-nodejs-modules */
import { MetaMaskMobileBuildCapability } from '../capabilities/build';

jest.mock('child_process');
jest.mock('fs');
jest.mock('path');

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockPath = path as jest.Mocked<typeof path>;

describe('MetaMaskMobileBuildCapability', () => {
  let buildCapability: MetaMaskMobileBuildCapability;
  let mockDateNow: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.join = jest.fn((...args) => args.join('/'));
    (process as { cwd: () => string }).cwd = jest.fn(() => '/test/cwd');
    mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    mockDateNow.mockRestore();
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('creates instance with default options', () => {
      buildCapability = new MetaMaskMobileBuildCapability();

      expect(buildCapability).toBeDefined();
      expect(buildCapability.getExtensionPath()).toBe(
        '/test/cwd/ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app',
      );
    });

    it('creates instance with custom options', () => {
      buildCapability = new MetaMaskMobileBuildCapability({
        command: 'yarn custom:build',
        outputPath: 'custom/path/MetaMask.app',
        timeout: 300000,
        simulatorName: 'iPhone 15',
      });

      expect(buildCapability).toBeDefined();
      expect(buildCapability.getExtensionPath()).toBe(
        '/test/cwd/custom/path/MetaMask.app',
      );
    });
  });

  describe('getExtensionPath', () => {
    it('returns absolute path to app bundle', () => {
      buildCapability = new MetaMaskMobileBuildCapability({
        outputPath: 'ios/build/MetaMask.app',
      });

      const result = buildCapability.getExtensionPath();

      expect(result).toBe('/test/cwd/ios/build/MetaMask.app');
      expect(mockPath.join).toHaveBeenCalledWith(
        '/test/cwd',
        'ios/build/MetaMask.app',
      );
    });
  });

  describe('isBuilt', () => {
    it('returns true when app bundle exists', async () => {
      buildCapability = new MetaMaskMobileBuildCapability();
      mockExistsSync.mockReturnValue(true);

      const result = await buildCapability.isBuilt();

      expect(result).toBe(true);
      expect(mockExistsSync).toHaveBeenCalledWith(
        '/test/cwd/ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app',
      );
    });

    it('returns false when app bundle does not exist', async () => {
      buildCapability = new MetaMaskMobileBuildCapability();
      mockExistsSync.mockReturnValue(false);

      const result = await buildCapability.isBuilt();

      expect(result).toBe(false);
    });
  });

  describe('build', () => {
    it('skips build when already built and force is false', async () => {
      buildCapability = new MetaMaskMobileBuildCapability();
      mockExistsSync.mockReturnValue(true);

      const result = await buildCapability.build({ force: false });

      expect(result.success).toBe(true);
      expect(result.extensionPath).toBe(
        '/test/cwd/ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app',
      );
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('executes build when not built', async () => {
      buildCapability = new MetaMaskMobileBuildCapability();
      mockExistsSync.mockReturnValue(false);

      const mockProcess: { on: jest.Mock; kill: jest.Mock } = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
          return mockProcess;
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess as never);

      const result = await buildCapability.build();

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'yarn',
        ['expo', 'run:ios', '--no-install'],
        expect.objectContaining({
          cwd: '/test/cwd',
          stdio: 'inherit',
          env: expect.objectContaining({
            IOS_SIMULATOR: 'iPhone 16',
          }),
        }),
      );
    });

    it('executes build with custom buildType', async () => {
      buildCapability = new MetaMaskMobileBuildCapability();
      mockExistsSync.mockReturnValue(false);

      const mockProcess: { on: jest.Mock; kill: jest.Mock } = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
          return mockProcess;
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess as never);

      const result = await buildCapability.build({
        buildType: 'build:ios:main:dev',
      });

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'yarn',
        ['build:ios:main:dev'],
        expect.any(Object),
      );
    });

    it('returns error when build process exits with non-zero code', async () => {
      buildCapability = new MetaMaskMobileBuildCapability();
      mockExistsSync.mockReturnValue(false);

      const mockProcess: { on: jest.Mock; kill: jest.Mock } = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10);
          }
          return mockProcess;
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess as never);

      const result = await buildCapability.build();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Build process exited with code 1');
    });

    it('returns error when build process times out', async () => {
      buildCapability = new MetaMaskMobileBuildCapability({ timeout: 100 });
      mockExistsSync.mockReturnValue(false);

      const mockProcess: { on: jest.Mock; kill: jest.Mock } = {
        on: jest.fn(() => mockProcess),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess as never);

      const result = await buildCapability.build();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Build timed out after 100ms');
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    it('returns error when spawn throws error', async () => {
      buildCapability = new MetaMaskMobileBuildCapability();
      mockExistsSync.mockReturnValue(false);

      const mockProcess: { on: jest.Mock; kill: jest.Mock } = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Spawn failed')), 10);
          }
          return mockProcess;
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess as never);

      const result = await buildCapability.build();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Spawn failed');
    });

    it('forces rebuild when force option is true', async () => {
      buildCapability = new MetaMaskMobileBuildCapability();
      mockExistsSync.mockReturnValue(true);

      const mockProcess: { on: jest.Mock; kill: jest.Mock } = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
          return mockProcess;
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess as never);

      const result = await buildCapability.build({ force: true });

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalled();
    });

    it('includes duration in result when build succeeds', async () => {
      buildCapability = new MetaMaskMobileBuildCapability();
      mockExistsSync.mockReturnValue(false);
      mockDateNow.mockReturnValueOnce(1000).mockReturnValueOnce(2000);

      const mockProcess: { on: jest.Mock; kill: jest.Mock } = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
          return mockProcess;
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess as never);

      const result = await buildCapability.build();

      expect(result.durationMs).toBe(1000);
    });
  });
});
