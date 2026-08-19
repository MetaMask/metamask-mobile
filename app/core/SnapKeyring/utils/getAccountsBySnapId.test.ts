import { SnapId } from '@metamask/snaps-sdk';
import { Keyring as KeyringV2 } from '@metamask/keyring-api/v2';
import { isSnapKeyring } from '@metamask/eth-snap-keyring/v2';
import Engine from '../../../core/Engine';
import { getAccountsBySnapId } from './getAccountsBySnapId';
import {
  KeyringMetadata,
  KeyringSelectorV2,
} from '@metamask/keyring-controller';

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      withKeyringV2: jest.fn(),
    },
  },
}));

const mockWithKeyringV2 = jest.mocked(
  Engine.context.KeyringController.withKeyringV2,
);

jest.mock('@metamask/eth-snap-keyring/v2', () => ({
  isSnapKeyring: jest.fn(),
}));

const mockIsSnapKeyring = jest.mocked(isSnapKeyring);

const MOCK_SNAP_ID = 'npm:@metamask/test-snap' as SnapId;

const mockKeyringWithAccounts = (
  accounts: { address: string }[],
  snapId: SnapId = MOCK_SNAP_ID,
) => {
  const keyring = {
    snapId,
    getAccounts: jest.fn().mockResolvedValue(accounts),
  } as unknown as KeyringV2; // Partial implementation.
  mockWithKeyringV2.mockImplementation(
    (
      _selector: KeyringSelectorV2,
      callback: (arg: {
        keyring: KeyringV2;
        metadata: KeyringMetadata;
      }) => Promise<unknown>,
    ) => callback({ keyring, metadata: {} as KeyringMetadata }),
  );
  return keyring;
};

describe('getAccountsBySnapId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns account addresses for the given snap', async () => {
    mockIsSnapKeyring.mockReturnValue(true);
    mockKeyringWithAccounts([{ address: '0x123' }, { address: '0x456' }]);

    const result = await getAccountsBySnapId(MOCK_SNAP_ID);

    expect(result).toEqual(['0x123', '0x456']);
  });

  it('returns an empty array when no keyring exists for the snap', async () => {
    mockWithKeyringV2.mockRejectedValue(new Error('No keyring found'));

    const result = await getAccountsBySnapId(MOCK_SNAP_ID);

    expect(result).toEqual([]);
  });

  it('returns an empty array when the keyring is not a snap keyring', async () => {
    mockIsSnapKeyring.mockReturnValue(false);
    mockKeyringWithAccounts([]);

    const result = await getAccountsBySnapId(MOCK_SNAP_ID);

    expect(result).toEqual([]);
  });
});
