import { removeNonEvmToken } from './removeNonEvmToken';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

jest.mock('../../../../core/Engine', () => ({
  context: {
    MultichainAssetsController: {
      ignoreAssets: jest.fn(() => Promise.resolve()),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

describe('removeNonEvmToken', () => {
  const mockSelectInternalAccountByScope = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls MultichainAssetsController.ignoreAssets when account is found', async () => {
    mockSelectInternalAccountByScope.mockReturnValue({
      id: 'non-evm-account-id',
      address: 'solana-address',
    });

    await removeNonEvmToken({
      tokenAddress: 'solana:token123',
      tokenChainId: 'solana:mainnet',
      selectInternalAccountByScope: mockSelectInternalAccountByScope,
    });

    expect(mockSelectInternalAccountByScope).toHaveBeenCalledWith(
      'solana:mainnet',
    );
    expect(
      Engine.context.MultichainAssetsController.ignoreAssets,
    ).toHaveBeenCalledWith(['solana:token123'], 'non-evm-account-id');
  });

  it('logs error and exits early when no account is found', async () => {
    mockSelectInternalAccountByScope.mockReturnValue(null);

    await removeNonEvmToken({
      tokenAddress: 'solana:token123',
      tokenChainId: 'solana:mainnet',
      selectInternalAccountByScope: mockSelectInternalAccountByScope,
    });

    expect(mockSelectInternalAccountByScope).toHaveBeenCalledWith(
      'solana:mainnet',
    );
    expect(Logger.log).toHaveBeenCalledWith('Tokens List: No account ID found');
    expect(
      Engine.context.MultichainAssetsController.ignoreAssets,
    ).not.toHaveBeenCalled();
  });

  it('passes correct chainId to selector', async () => {
    mockSelectInternalAccountByScope.mockReturnValue({
      id: 'btc-account-id',
      address: 'btc-address',
    });

    await removeNonEvmToken({
      tokenAddress: 'bip122:token456',
      tokenChainId: 'bip122:000000000019d6689c085ae165831e93',
      selectInternalAccountByScope: mockSelectInternalAccountByScope,
    });

    expect(mockSelectInternalAccountByScope).toHaveBeenCalledWith(
      'bip122:000000000019d6689c085ae165831e93',
    );
  });

  it('passes correct asset address to ignoreAssets', async () => {
    mockSelectInternalAccountByScope.mockReturnValue({
      id: 'account-id',
      address: 'account-address',
    });

    await removeNonEvmToken({
      tokenAddress: 'solana:differenttoken456',
      tokenChainId: 'solana:mainnet',
      selectInternalAccountByScope: mockSelectInternalAccountByScope,
    });

    expect(
      Engine.context.MultichainAssetsController.ignoreAssets,
    ).toHaveBeenCalledWith(['solana:differenttoken456'], 'account-id');
  });
});
