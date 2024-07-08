import { generateStateLogs } from '.';
import { backgroundState } from '../../util/test/initial-root-state';

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
