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
import MetaMetrics from '../../core/Analytics/MetaMetrics';
import Engine from '../../core/Engine';
import { SecretType } from '@metamask/seedless-onboarding-controller';

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
        isUnlocked: true,
      },
    },
    SeedlessOnboardingController: {
      state: {},
    },
  },
}));

jest.mock('../../core/Analytics/MetaMetrics');

const mockMetrics = {
  isEnabled: jest.fn(() => true),
  getMetaMetricsId: jest.fn(() =>
    Promise.resolve('6D796265-7374-4953-6D65-74616D61736B'),
  ),
};

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

describe('logs :: generateStateLogs', () => {
  it('generates a valid json export', async () => {
    const mockStateInput = {
      appVersion: '1',
      buildNumber: '123',
      metaMetricsId: '6D796265-7374-4953-6D65-74616D61736B',
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

    expect(JSON.parse(logs)).toMatchSnapshot();
  });

  it('generates the expected state logs without the explicitly deleted controller states', async () => {
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

  it('includes isUnlocked state from KeyringController', () => {
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
    const parsedLogs = JSON.parse(logs);

    expect(parsedLogs.engine.backgroundState.KeyringController.isUnlocked).toBe(
      true,
    );
  });

  it('generates extra logs if values added to the state object parameter', () => {
    const mockStateInput = {
      appVersion: '1',
      buildNumber: '123',
      metaMetricsId: '6D796265-7374-4953-6D65-74616D61736B',
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
    expect(logs.includes('metaMetricsId')).toBe(true);
  });

  describe('Sanitized SeedlessOnboardingController State', () => {
    it('Able to generate logs when SeedlessOnboardingController state is empty', () => {
      const mockStateInput = {
        appVersion: '1',
        buildNumber: '123',
        metaMetricsId: '6D796265-7374-4953-6D65-74616D61736B',
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

      const logsObj = JSON.parse(logs);
      const {
        vault,
        vaultEncryptionKey,
        vaultEncryptionSalt,
        encryptedSeedlessEncryptionKey,
        encryptedKeyringEncryptionKey,
        metadataAccessToken,
        accessToken,
        refreshToken,
        revokeToken,
      } = logsObj.engine.backgroundState.SeedlessOnboardingController;

      expect(vault).toBe(false);
      expect(vaultEncryptionKey).toBe(false);
      expect(vaultEncryptionSalt).toBe(false);
      expect(encryptedSeedlessEncryptionKey).toBe(false);
      expect(encryptedKeyringEncryptionKey).toBe(false);
      expect(metadataAccessToken).toBe(false);
      expect(accessToken).toBe(false);
      expect(refreshToken).toBe(false);
      expect(revokeToken).toBe(false);
    });

    it('Able to generate logs with Sanitized SeedlessOnboardingController sensitive data', () => {
      Engine.context.SeedlessOnboardingController.state = {
        userId: 'userId',
        isSeedlessOnboardingUserAuthenticated: true,
        socialBackupsMetadata: [
          {
            type: SecretType.Mnemonic,
            keyringId: 'keyring1',
            hash: 'should not be in logs',
          },
          // @ts-expect-error - the test case is to test the input being not the expected
          null,
        ],
        nodeAuthTokens: [
          { nodeIndex: 1, authToken: 'authToken', nodePubKey: 'nodePubKey' },
          { nodeIndex: 2, authToken: 'authToken', nodePubKey: 'nodePubKey' },
          // @ts-expect-error - the test case is to test the input being not the expected
          null,
        ],

        vault: 'should be a boolean',
        vaultEncryptionKey: 'should be a boolean',
        vaultEncryptionSalt: 'should be a boolean',
        encryptedSeedlessEncryptionKey: 'should be a boolean',
        encryptedKeyringEncryptionKey: 'should be a boolean',
        metadataAccessToken: 'should be a boolean',
        accessToken: 'should be a boolean',
        refreshToken: 'should be a boolean',
        revokeToken: 'should be a boolean',
      };

      const mockStateInput = {
        appVersion: '1',
        buildNumber: '123',
        metaMetricsId: '6D796265-7374-4953-6D65-74616D61736B',
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

      const logsObj = JSON.parse(logs);
      const {
        vault,
        vaultEncryptionKey,
        vaultEncryptionSalt,
        encryptedSeedlessEncryptionKey,
        encryptedKeyringEncryptionKey,
        metadataAccessToken,
        accessToken,
        refreshToken,
        revokeToken,
        nodeAuthTokens,
        socialBackupsMetadata,
      } = logsObj.engine.backgroundState.SeedlessOnboardingController;

      expect(nodeAuthTokens[0].nodeIndex).toBe(1);
      expect(nodeAuthTokens[0].authToken).toBe(undefined);

      expect(socialBackupsMetadata[0].keyringId).toBe('keyring1');
      expect(socialBackupsMetadata[0].hash).toBe(undefined);
      expect(vault).toBe(true);
      expect(vaultEncryptionKey).toBe(true);
      expect(vaultEncryptionSalt).toBe(true);
      expect(encryptedSeedlessEncryptionKey).toBe(true);
      expect(encryptedKeyringEncryptionKey).toBe(true);
      expect(metadataAccessToken).toBe(true);
      expect(accessToken).toBe(true);
      expect(refreshToken).toBe(true);
      expect(revokeToken).toBe(true);

      expect(JSON.parse(logs)).toMatchSnapshot();
    });
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

  it('does not include metametrics id if not opt-in', async () => {
    (getApplicationName as jest.Mock).mockResolvedValue('TestApp');
    (getVersion as jest.Mock).mockResolvedValue('1.0.0');
    (getBuildNumber as jest.Mock).mockResolvedValue('100');
    (Device.isIos as jest.Mock).mockReturnValue(false);
    (mockMetrics.isEnabled as jest.Mock).mockReturnValue(false);

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

    expect(Share.open).toHaveBeenCalledWith({
      subject: 'TestApp State logs -  v1.0.0 (100)',
      title: 'TestApp State logs -  v1.0.0 (100)',
      url: expect.stringContaining('data:text/plain;base64,'),
    });

    // Access the arguments passed to Share.open
    const shareOpenCalls = (Share.open as jest.Mock).mock.calls;
    expect(shareOpenCalls.length).toBeGreaterThan(0);
    const [shareOpenArgs] = shareOpenCalls[0];
    const { url } = shareOpenArgs;
    const base64Data = url.replace('data:text/plain;base64,', '');
    const decodedData = Buffer.from(base64Data, 'base64').toString('utf-8');
    const jsonData = JSON.parse(decodedData);
    expect(jsonData).not.toHaveProperty('metaMetricsId');
  });
});
