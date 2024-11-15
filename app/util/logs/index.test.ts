import { generateStateLogs, downloadStateLogs } from '.';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {
  getApplicationName,
  getBuildNumber,
  getVersion,
} from 'react-native-device-info';
import Device from '../../util/device';
import Logger from '../../util/Logger';
import initialRootState, {
  backgroundState,
} from '../../util/test/initial-root-state';
import { merge } from 'lodash';

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/path',
  writeFile: jest.fn(),
}));

jest.mock('react-native-share', () => ({
  open: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getApplicationName: jest.fn(),
  getBuildNumber: jest.fn(),
  getVersion: jest.fn(),
}));

jest.mock('../../util/device', () => ({
  isIos: jest.fn(),
  isAndroid: jest.fn(),
}));

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: ['keyring1', 'keyring2'],
      },
    },
  },
}));

describe('logs :: generateStateLogs', () => {
  it('should generate the state logs correctly without the explicitly deleted controller states', async () => {
    const mockStateInput = {
      engine: {
        backgroundState: {
          ...backgroundState,
          KeyringController: {
            vault: 'vault mock',
          },
        },
      },
    };
    const logs = generateStateLogs(mockStateInput);

    expect(logs.includes('NftController')).toBe(false);
    expect(logs.includes('TokensController')).toBe(false);
    expect(logs.includes('AssetsContractController')).toBe(false);
    expect(logs.includes('TokenDetectionController')).toBe(false);
    expect(logs.includes('NftDetectionController')).toBe(false);
    expect(logs.includes('PhishingController')).toBe(false);
    expect(logs.includes("vault: 'vault mock'")).toBe(false);
  });

  it('generates extra logs if values added to the state object parameter', () => {
    const mockStateInput = {
      appVersion: '1',
      buildNumber: '123',
      engine: {
        backgroundState: {
          ...backgroundState,
          KeyringController: {
            vault: 'vault mock',
          },
        },
      },
    };
    const logs = generateStateLogs(mockStateInput);

    expect(logs.includes('NftController')).toBe(false);
    expect(logs.includes('TokensController')).toBe(false);
    expect(logs.includes('AssetsContractController')).toBe(false);
    expect(logs.includes('TokenDetectionController')).toBe(false);
    expect(logs.includes('NftDetectionController')).toBe(false);
    expect(logs.includes('PhishingController')).toBe(false);
    expect(logs.includes("vault: 'vault mock'")).toBe(false);
    expect(logs.includes('appVersion')).toBe(true);
    expect(logs.includes('buildNumber')).toBe(true);
  });
});

describe('logs :: downloadStateLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate and share logs successfully on iOS', async () => {
    (getApplicationName as jest.Mock).mockResolvedValue('TestApp');
    (getVersion as jest.Mock).mockResolvedValue('1.0.0');
    (getBuildNumber as jest.Mock).mockResolvedValue('100');
    (Device.isIos as jest.Mock).mockReturnValue(true);

    const mockStateInput = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          ...backgroundState,
          KeyringController: {
            vault: 'vault mock',
          },
        },
      },
    });

    await downloadStateLogs(mockStateInput);

    expect(RNFS.writeFile).toHaveBeenCalledWith(
      '/mock/path/state-logs-v1.0.0-(100).json',
      expect.any(String),
      'utf8',
    );
    expect(Share.open).toHaveBeenCalledWith({
      subject: 'TestApp State logs -  v1.0.0 (100)',
      title: 'TestApp State logs -  v1.0.0 (100)',
      url: '/mock/path/state-logs-v1.0.0-(100).json',
    });
  });

  it('should generate and share logs successfully on Android', async () => {
    (getApplicationName as jest.Mock).mockResolvedValue('TestApp');
    (getVersion as jest.Mock).mockResolvedValue('1.0.0');
    (getBuildNumber as jest.Mock).mockResolvedValue('100');
    (Device.isIos as jest.Mock).mockReturnValue(false);

    const mockStateInput = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          ...backgroundState,
          KeyringController: {
            vault: 'vault mock',
          },
        },
      },
    });

    await downloadStateLogs(mockStateInput);

    expect(RNFS.writeFile).not.toHaveBeenCalled();
    expect(Share.open).toHaveBeenCalledWith({
      subject: 'TestApp State logs -  v1.0.0 (100)',
      title: 'TestApp State logs -  v1.0.0 (100)',
      url: expect.stringContaining('data:text/plain;base64,'),
    });
  });

  it('should handle errors during log generation', async () => {
    (getApplicationName as jest.Mock).mockResolvedValue('TestApp');
    (getVersion as jest.Mock).mockResolvedValue('1.0.0');
    (getBuildNumber as jest.Mock).mockResolvedValue('100');
    (Device.isIos as jest.Mock).mockReturnValue(true);

    const mockStateInput = null;

    //@ts-expect-error - the test case is to test the input being not the expected
    await downloadStateLogs(mockStateInput);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'State log error',
    );
  });

  it('should handle errors during file writing on iOS', async () => {
    (getApplicationName as jest.Mock).mockResolvedValue('TestApp');
    (getVersion as jest.Mock).mockResolvedValue('1.0.0');
    (getBuildNumber as jest.Mock).mockResolvedValue('100');
    (Device.isIos as jest.Mock).mockReturnValue(true);
    (RNFS.writeFile as jest.Mock).mockRejectedValue(
      new Error('File write error'),
    );

    const mockStateInput = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          ...backgroundState,
          KeyringController: {
            vault: 'vault mock',
          },
        },
      },
    });

    await downloadStateLogs(mockStateInput);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'State log error',
    );
  });

  it('should handle errors during sharing', async () => {
    (getApplicationName as jest.Mock).mockResolvedValue('TestApp');
    (getVersion as jest.Mock).mockResolvedValue('1.0.0');
    (getBuildNumber as jest.Mock).mockResolvedValue('100');
    (Device.isIos as jest.Mock).mockReturnValue(false);
    (Share.open as jest.Mock).mockRejectedValue(new Error('Share error'));

    const mockStateInput = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          ...backgroundState,
          KeyringController: {
            vault: 'vault mock',
          },
        },
      },
    });

    await downloadStateLogs(mockStateInput);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'State log error',
    );
  });

  it('should handle loggedIn as false', async () => {
    (getApplicationName as jest.Mock).mockResolvedValue('TestApp');
    (getVersion as jest.Mock).mockResolvedValue('1.0.0');
    (getBuildNumber as jest.Mock).mockResolvedValue('100');
    (Device.isIos as jest.Mock).mockReturnValue(false);

    const mockStateInput = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          ...backgroundState,
          KeyringController: {
            vault: 'vault mock',
          },
        },
      },
    });

    await downloadStateLogs(mockStateInput, false);

    expect(Share.open).toHaveBeenCalledWith({
      subject: 'TestApp State logs -  v1.0.0 (100)',
      title: 'TestApp State logs -  v1.0.0 (100)',
      url: expect.stringContaining('data:text/plain;base64,'),
    });
  });
});
