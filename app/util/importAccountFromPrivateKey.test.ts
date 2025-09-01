import { AccountImportStrategy } from '@metamask/keyring-controller';
import { importAccountFromPrivateKey } from './importAccountFromPrivateKey';

const mockSetSelectedAddress = jest.fn();
const mockImportAccountWithStrategy = jest.fn();
const mockCheckIsSeedlessPasswordOutdated = jest.fn();
const mockImportAccountFromPrivateKey = jest.fn();

jest.mock('../core/Engine', () => ({
  setSelectedAddress: (address: string) => mockSetSelectedAddress(address),
  context: {
    KeyringController: {
      importAccountWithStrategy: (
        strategy: AccountImportStrategy,
        private_key: string,
      ) => mockImportAccountWithStrategy(strategy, private_key),
    },
  },
}));

jest.mock('../core/Authentication/Authentication', () => ({
  Authentication: {
    checkIsSeedlessPasswordOutdated: (skipCache: boolean) =>
      mockCheckIsSeedlessPasswordOutdated(skipCache),
    importAccountFromPrivateKey: (privateKey: string) =>
      mockImportAccountFromPrivateKey(privateKey),
  },
}));

describe('importAccountFromPrivateKey', () => {
  const mockPrivateKey =
    '0000111122223333444455556666777788889999000011112222333344445555';
  const mockPublicKey = '0x1122334455667788990011223344556677889900';

  beforeEach(() => {
    jest.resetAllMocks();
    // Default mock implementations
    mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(false);
    mockImportAccountFromPrivateKey.mockResolvedValue(undefined);
  });

  it('import an account from a private key and select it', async () => {
    mockImportAccountWithStrategy.mockResolvedValue(mockPublicKey);

    await importAccountFromPrivateKey(mockPrivateKey);

    expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith(true);
    expect(mockImportAccountFromPrivateKey).toHaveBeenCalledWith(
      mockPrivateKey,
    );
  });

  it('import an account from a private key and remove the 0x prefix', async () => {
    await importAccountFromPrivateKey(`0x${mockPrivateKey}`);

    expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith(true);
    expect(mockImportAccountFromPrivateKey).toHaveBeenCalledWith(
      `0x${mockPrivateKey}`,
    );
  });

  it('returns early when password is outdated', async () => {
    mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(true);

    await importAccountFromPrivateKey(mockPrivateKey);

    expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith(true);
    expect(mockImportAccountFromPrivateKey).not.toHaveBeenCalled();
  });
});
