import { SOLANA_WALLET_SNAP_ID } from '../../core/SnapKeyring/SolanaWalletSnap';
import { RootState } from '../../reducers';
import {
  createMockInternalAccount,
  createMockSnapInternalAccount,
} from '../../util/test/accountsControllerTestUtils';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import { useKeyringId } from './useKeyringId';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';

const mockHdKeyringEntropySource = '01JNG7170V9X27V5NFDTY04PJ4';
const mockHdKeyringEntropySource2 = '01JWFMYZ64C4RVB68AT0HGAZ2X';
const mockSnapKeyringEntropySource = '01JNG71B7GTWH0J1TSJY9891S0';

const hdAccount = createMockInternalAccount(
  '0x4d8279c715e5BDC4aBb7ECFa8cC5046BE79EA195',
  'HD Account',
);
const hdAccount2 = createMockInternalAccount(
  '0x0aBF1CfDF49aceEbca3BD76b4b3E0C7D797e994E',
  'HD Account 2',
);
const solanaAccount = createMockSnapInternalAccount(
  'CagKAHspdf5k6iu1acazft6cdGSKkqtMUKLaw1TnGaDR',
  'Solana Account',
  SolAccountType.DataAccount,
  mockHdKeyringEntropySource,
);
solanaAccount.metadata.snap = {
  id: SOLANA_WALLET_SNAP_ID,
  name: 'Solana Wallet Snap',
  enabled: true,
};

const snapAccount = createMockSnapInternalAccount(
  '0x123',
  'Snap Account',
  EthAccountType.Eoa,
  mockSnapKeyringEntropySource,
);

const hdKeyring = {
  accounts: [hdAccount.address],
  type: KeyringTypes.hd,
  metadata: {
    id: mockHdKeyringEntropySource,
    name: '',
  },
};

const hdKeyring2 = {
  accounts: [hdAccount2.address],
  type: KeyringTypes.hd,
  metadata: {
    id: mockHdKeyringEntropySource2,
    name: '',
  },
};

const snapKeyring = {
  accounts: [solanaAccount.address, snapAccount.address],
  type: KeyringTypes.snap,
  metadata: {
    id: mockSnapKeyringEntropySource,
    name: '',
  },
};

const mockInitialState = {
  engine: {
    backgroundState: {
      KeyringController: {
        keyrings: [hdKeyring, hdKeyring2, snapKeyring],
      },
    },
  },
} as unknown as RootState;

describe('useKeyringId', () => {
  it.each([
    {
      name: 'returns entropySource for first party snap with entropySource',
      account: solanaAccount,
      expected: mockHdKeyringEntropySource,
    },
    {
      name: 'returns keyring id for snap account without entropy source',
      account: snapAccount,
      expected: mockSnapKeyringEntropySource,
    },
    {
      name: 'returns keyring id for regular account',
      account: hdAccount,
      expected: mockHdKeyringEntropySource,
    },
    {
      name: 'returns keyring id for regular account from second keyring',
      account: hdAccount2,
      expected: mockHdKeyringEntropySource2,
    },
  ])('$name', ({ account, expected }) => {
    const { result } = renderHookWithProvider(() => useKeyringId(account), {
      state: mockInitialState,
    });
    expect(result?.current).toBe(expected);
  });

  it('throws error when keyring not found', () => {
    const account = createMockInternalAccount('0x999', 'Test Account');
    expect(() => {
      renderHookWithProvider(() => useKeyringId(account), {
        state: mockInitialState,
      });
    }).toThrow('[useKeyringId] - Keyring not found');
  });
});
