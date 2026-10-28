import { toChecksumHexAddress } from '@metamask/controller-utils';
import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import { MOCK_HD_KEYRING_METADATA } from '../../../../../selectors/keyringController/testUtils';
import { getVbaWalletAddress } from './vbaWalletAddress';

const MONEY_ACCOUNT_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

const mockEngine: { state: Record<string, unknown> } = { state: {} };

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    get state() {
      return mockEngine.state;
    },
  },
}));

const buildEngineState = (keyrings: unknown[]) => ({
  KeyringController: { isUnlocked: keyrings.length > 0, keyrings },
  MoneyAccountController: {
    moneyAccounts: {
      'account-1': {
        id: 'account-1',
        address: MONEY_ACCOUNT_ADDRESS,
        type: 'eip155:eoa',
        scopes: [],
        methods: [],
        options: {
          entropy: {
            type: 'mnemonic',
            id: MOCK_HD_KEYRING_METADATA.id,
            derivationPath: "m/44'/60'/0'/0",
            groupIndex: 0,
          },
          exportable: false,
        },
      },
    },
  },
});

describe('getVbaWalletAddress', () => {
  it('reads the money account wallet from live controller state', () => {
    mockEngine.state = buildEngineState([
      {
        type: ExtendedKeyringTypes.hd,
        accounts: [],
        metadata: MOCK_HD_KEYRING_METADATA,
      },
    ]);

    expect(getVbaWalletAddress()).toBe(
      toChecksumHexAddress(MONEY_ACCOUNT_ADDRESS),
    );
  });

  it('returns null while the keyring is locked', () => {
    mockEngine.state = buildEngineState([]);

    expect(getVbaWalletAddress()).toBeNull();
  });
});
