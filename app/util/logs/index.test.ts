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
import { KeyringObject, KeyringTypes } from '@metamask/keyring-controller';

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

jest.mock(
  '../../core/Engine/controllers/remote-feature-flag-controller/utils',
  () => ({
    getFeatureFlagAppEnvironment: jest.fn(() => 'Development'),
    getFeatureFlagAppDistribution: jest.fn(() => 'Main'),
  }),
);

const mockMetrics = {
  isEnabled: jest.fn(() => true),
  getMetaMetricsId: jest.fn(() =>
    Promise.resolve('6D796265-7374-4953-6D65-74616D61736B'),
  ),
};

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

describe('logs :: generateStateLogs', () => {
  beforeEach(() => {
    Engine.context.KeyringController.state = {
      keyrings: [
        {
          accounts: ['0x1'],
          type: KeyringTypes.hd,
          metadata: { id: 'keyring1', name: '' },
        },
        {
          accounts: ['0x2'],
          type: KeyringTypes.simple,
          metadata: { id: 'keyring2', name: '' },
        },
      ] as KeyringObject[],
      isUnlocked: true,
      vault: undefined,
    };
    Engine.context.SeedlessOnboardingController.state = {
      socialBackupsMetadata: [],
      isSeedlessOnboardingUserAuthenticated: false,
    } as typeof Engine.context.SeedlessOnboardingController.state;
  });

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

  it('excludes deleted controller states from logs', () => {
    const mockStateInput = {
      engine: {
        backgroundState: {
          ...backgroundState,
          NftController: { nfts: [] },
          TokensController: { tokens: [] },
          TokenDetectionController: { detectedTokens: [] },
          NftDetectionController: { detectedNfts: [] },
          PhishingController: { whitelist: [] },
          AssetsContractController: { assets: [] },
          DeFiPositionsController: { positions: [] },
          PredictController: { predictions: [] },
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
    expect(logs.includes('DeFiPositionsController')).toBe(false);
    expect(logs.includes('PredictController')).toBe(false);
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

  it('sets vaultExists to true when vault has a value', () => {
    Engine.context.KeyringController.state = {
      keyrings: [
        {
          accounts: ['0x1'],
          type: KeyringTypes.hd,
          metadata: { id: 'keyring1', name: '' },
        },
      ] as KeyringObject[],
      isUnlocked: true,
      vault: 'some-vault-data',
    };

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

    expect(
      parsedLogs.engine.backgroundState.KeyringController.vaultExists,
    ).toBe(true);
  });

  it('sets vaultExists to false when vault is null', () => {
    Engine.context.KeyringController.state = {
      keyrings: [
        {
          accounts: ['0x1'],
          type: KeyringTypes.hd,
          metadata: { id: 'keyring1', name: '' },
        },
      ] as KeyringObject[],
      isUnlocked: true,
      // @ts-expect-error - testing null vault handling
      vault: null,
    };

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

    expect(
      parsedLogs.engine.backgroundState.KeyringController.vaultExists,
    ).toBe(false);
  });

  it('sets vaultExists to false when vault is undefined', () => {
    Engine.context.KeyringController.state = {
      keyrings: [
        {
          accounts: ['0x1'],
          type: KeyringTypes.hd,
          metadata: { id: 'keyring1', name: '' },
        },
      ] as KeyringObject[],
      isUnlocked: true,
      vault: undefined,
    };

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

    expect(
      parsedLogs.engine.backgroundState.KeyringController.vaultExists,
    ).toBe(false);
  });

  it('sets vaultExists to false when vault is empty string', () => {
    Engine.context.KeyringController.state = {
      keyrings: [
        {
          accounts: ['0x1'],
          type: KeyringTypes.hd,
          metadata: { id: 'keyring1', name: '' },
        },
      ] as KeyringObject[],
      isUnlocked: true,
      vault: '',
    };

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

    expect(
      parsedLogs.engine.backgroundState.KeyringController.vaultExists,
    ).toBe(false);
  });

  it('sets vaultExists to false when KeyringController state is undefined', () => {
    // @ts-expect-error - testing undefined state handling
    Engine.context.KeyringController.state = undefined;

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

    expect(
      parsedLogs.engine.backgroundState.KeyringController.vaultExists,
    ).toBe(false);
  });

  it('includes loggedIn parameter in generated logs', () => {
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

    const logs = generateStateLogs(mockStateInput, false);
    const parsedLogs = JSON.parse(logs);

    expect(parsedLogs.loggedIn).toBe(false);
  });

  it('defaults loggedIn to true when not provided', () => {
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

    expect(parsedLogs.loggedIn).toBe(true);
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
    beforeEach(() => {
      Engine.context.SeedlessOnboardingController.state = {
        socialBackupsMetadata: [],
        isSeedlessOnboardingUserAuthenticated: false,
      } as typeof Engine.context.SeedlessOnboardingController.state;
    });

    it('generates logs when SeedlessOnboardingController state is empty', () => {
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

    it('generates logs with sanitized SeedlessOnboardingController sensitive data', () => {
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

    it('includes authConnection fields in sanitized state', () => {
      Engine.context.SeedlessOnboardingController.state = {
        authConnection:
          'google' as typeof Engine.context.SeedlessOnboardingController.state.authConnection,
        authConnectionId: 'connection-id-123',
        authPubKey: 'pub-key-123',
        userId: 'user-123',
        socialBackupsMetadata: [],
        isSeedlessOnboardingUserAuthenticated: false,
      } as typeof Engine.context.SeedlessOnboardingController.state;

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

      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController
          .authConnection,
      ).toBe('google');
      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController
          .authConnectionId,
      ).toBe('connection-id-123');
      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController
          .authPubKey,
      ).toBe('pub-key-123');
      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController.userId,
      ).toBe('user-123');
    });

    it('handles SeedlessOnboardingController state being null', () => {
      // @ts-expect-error - testing null state handling
      Engine.context.SeedlessOnboardingController.state = null;

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

      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController.vault,
      ).toBe(false);
      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController
          .socialBackupsMetadata,
      ).toEqual([]);
      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController
          .nodeAuthTokens,
      ).toEqual([]);
    });

    it('handles SeedlessOnboardingController state being undefined', () => {
      // @ts-expect-error - testing undefined state handling
      Engine.context.SeedlessOnboardingController.state = undefined;

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

      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController.vault,
      ).toBe(false);
      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController
          .socialBackupsMetadata,
      ).toEqual([]);
      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController
          .nodeAuthTokens,
      ).toEqual([]);
    });

    it('filters out sensitive data from socialBackupsMetadata', () => {
      Engine.context.SeedlessOnboardingController.state = {
        socialBackupsMetadata: [
          {
            type: SecretType.Mnemonic,
            keyringId: 'keyring1',
            hash: 'sensitive-hash',
          },
          {
            type: SecretType.PrivateKey,
            keyringId: 'keyring2',
            hash: 'another-hash',
          },
        ],
        isSeedlessOnboardingUserAuthenticated: false,
      } as typeof Engine.context.SeedlessOnboardingController.state;

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

      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController
          .socialBackupsMetadata,
      ).toEqual([
        { type: SecretType.Mnemonic, keyringId: 'keyring1' },
        { type: SecretType.PrivateKey, keyringId: 'keyring2' },
      ]);
    });

    it('filters out sensitive data from nodeAuthTokens', () => {
      Engine.context.SeedlessOnboardingController.state = {
        nodeAuthTokens: [
          {
            nodeIndex: 1,
            nodePubKey: 'pub-key-1',
            authToken: 'sensitive-token-1',
          },
          {
            nodeIndex: 2,
            nodePubKey: 'pub-key-2',
            authToken: 'sensitive-token-2',
          },
        ],
        socialBackupsMetadata: [],
        isSeedlessOnboardingUserAuthenticated: false,
      } as typeof Engine.context.SeedlessOnboardingController.state;

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

      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController
          .nodeAuthTokens,
      ).toEqual([
        { nodeIndex: 1, nodePubKey: 'pub-key-1' },
        { nodeIndex: 2, nodePubKey: 'pub-key-2' },
      ]);
    });

    it('handles empty arrays in socialBackupsMetadata and nodeAuthTokens', () => {
      Engine.context.SeedlessOnboardingController.state = {
        socialBackupsMetadata: [],
        nodeAuthTokens: [],
        isSeedlessOnboardingUserAuthenticated: false,
      } as typeof Engine.context.SeedlessOnboardingController.state;

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

      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController
          .socialBackupsMetadata,
      ).toEqual([]);
      expect(
        parsedLogs.engine.backgroundState.SeedlessOnboardingController
          .nodeAuthTokens,
      ).toEqual([]);
    });
  });
});

describe('logs :: downloadStateLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates and shares logs on iOS', async () => {
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

  it('generates and shares logs on Android', async () => {
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

  it('logs error when state is null during log generation', async () => {
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

  it('logs error when file writing fails on iOS', async () => {
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

  it('logs error when sharing fails', async () => {
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

  it('includes loggedIn as false in generated logs', async () => {
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

  it('excludes metametrics id when not opted in', async () => {
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

  it('includes remote feature flag environment in logs', async () => {
    // Given the device info and remote feature flag environment are set
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

    // When downloadStateLogs is called
    await downloadStateLogs(mockStateInput);

    // Then the logs should include the remote feature flag environment
    const shareOpenCalls = (Share.open as jest.Mock).mock.calls;
    expect(shareOpenCalls.length).toBeGreaterThan(0);
    const [shareOpenArgs] = shareOpenCalls[0];
    const { url } = shareOpenArgs;
    const base64Data = url.replace('data:text/plain;base64,', '');
    const decodedData = Buffer.from(base64Data, 'base64').toString('utf-8');
    const jsonData = JSON.parse(decodedData);
    expect(jsonData.remoteFeatureFlagEnvironment).toBe('Development');
  });

  it('includes remote feature flag distribution in logs', async () => {
    // Given the device info and remote feature flag distribution are set
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

    // When downloadStateLogs is called
    await downloadStateLogs(mockStateInput);

    // Then the logs should include the remote feature flag distribution
    const shareOpenCalls = (Share.open as jest.Mock).mock.calls;
    expect(shareOpenCalls.length).toBeGreaterThan(0);
    const [shareOpenArgs] = shareOpenCalls[0];
    const { url } = shareOpenArgs;
    const base64Data = url.replace('data:text/plain;base64,', '');
    const decodedData = Buffer.from(base64Data, 'base64').toString('utf-8');
    const jsonData = JSON.parse(decodedData);
    expect(jsonData.remoteFeatureFlagDistribution).toBe('Main');
  });

  it('includes OTA version in logs', async () => {
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

    const shareOpenCalls = (Share.open as jest.Mock).mock.calls;
    expect(shareOpenCalls.length).toBeGreaterThan(0);
    const [shareOpenArgs] = shareOpenCalls[0];
    const { url } = shareOpenArgs;
    const base64Data = url.replace('data:text/plain;base64,', '');
    const decodedData = Buffer.from(base64Data, 'base64').toString('utf-8');
    const jsonData = JSON.parse(decodedData);
    expect(jsonData.otaVersion).toBeDefined();
    expect(jsonData.runtimeVersion).toBeDefined();
  });
});
