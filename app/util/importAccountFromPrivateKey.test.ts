import { AccountImportStrategy } from '@metamask/keyring-controller';
import { importAccountFromPrivateKey } from './importAccountFromPrivateKey';

const mockSetSelectedAddress = jest.fn();
const mockImportAccountWithStrategy = jest.fn();

jest.mock('../core/Engine', () => ({
  setSelectedAddress: (address: string) => mockSetSelectedAddress(address),
  context: {
    KeyringController: {
      importAccountWithStrategy: (
        strategy: AccountImportStrategy,
        private_key: string
      ) => mockImportAccountWithStrategy(strategy, private_key),
    },
  },
}));

describe('importAccountFromPrivateKey', () => {
  const mockPrivateKey = '0000111122223333444455556666777788889999000011112222333344445555';
  const mockPublicKey = '0x1122334455667788990011223344556677889900';

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('import an account from a private key and select it', async () => {
    mockImportAccountWithStrategy.mockResolvedValue(mockPublicKey);

    await importAccountFromPrivateKey(mockPrivateKey);

    expect(mockImportAccountWithStrategy).toHaveBeenCalledWith(
      AccountImportStrategy.privateKey,
      [mockPrivateKey]
    );
    expect(mockSetSelectedAddress).toHaveBeenCalledWith(mockPublicKey);
  });

  it('import an account from a private key and remove the 0x prefix', async () => {
    await importAccountFromPrivateKey(`0x${mockPrivateKey}`);

    expect(mockImportAccountWithStrategy).toHaveBeenCalledWith(
      AccountImportStrategy.privateKey,
      [mockPrivateKey]
    );
  });
});
