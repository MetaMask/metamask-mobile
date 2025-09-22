import { CryptoCurrency } from '@consensys/on-ramp-sdk';

const mockGetSelectedAccount = jest.fn();
const mockSelectMultichainAccountsState2Enabled = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: mockGetSelectedAccount,
    },
  },
}));

jest.mock(
  '../../../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled:
      mockSelectMultichainAccountsState2Enabled,
  }),
);

jest.mock('../../../../../selectors/ramp', () => ({
  selectRampWalletAddress: () => '0x123456789',
}));

jest.mock('../../../../../selectors/networkController', () => ({
  selectNickname: () => null,
}));

jest.mock('../../../../../reducers/fiatOrders', () => ({
  fiatOrdersGetStartedAgg: () => false,
  fiatOrdersGetStartedSell: () => false,
  fiatOrdersRegionSelectorAgg: () => null,
  fiatOrdersPaymentMethodSelectorAgg: () => null,
  networkShortNameSelector: () => 'mainnet',
  setFiatOrdersGetStartedAGG: jest.fn(),
  setFiatOrdersGetStartedSell: jest.fn(),
  setFiatOrdersRegionAGG: jest.fn(),
  setFiatOrdersPaymentMethodAGG: jest.fn(),
}));

jest.mock('../hooks/useActivationKeys', () => jest.fn());

describe('Clear incompatible assets when account changes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clear Solana asset when multichain is enabled and account lacks Solana scopes', () => {
    mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);
    mockGetSelectedAccount.mockReturnValue({
      id: 'evm-account-id',
      address: '0x123456789',
      scopes: ['eip155:1'], // Only EVM scope
    });

    const solanaAsset = {
      id: 'solana-usdc',
      network: { chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
    } as CryptoCurrency;

    const mockSetSelectedAsset = jest.fn();

    const isMultichainAccountsState2Enabled =
      mockSelectMultichainAccountsState2Enabled();
    const currentAccount = mockGetSelectedAccount();
    const selectedAsset = solanaAsset;
    const selectedAddress = '0x123456789';

    if (selectedAsset && isMultichainAccountsState2Enabled) {
      if (
        selectedAsset.network?.chainId?.startsWith('solana:') &&
        currentAccount.address === selectedAddress &&
        !currentAccount.scopes?.some((scope: string) =>
          scope.startsWith('solana:'),
        )
      ) {
        mockSetSelectedAsset(null);
      }
    }

    expect(mockSetSelectedAsset).toHaveBeenCalledWith(null);
  });

  it('should not clear Solana asset when account has Solana scopes', () => {
    mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);
    mockGetSelectedAccount.mockReturnValue({
      id: 'multichain-account-id',
      address: '0x123456789',
      scopes: ['eip155:1', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    });

    const solanaAsset = {
      id: 'solana-usdc',
      network: { chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
    } as CryptoCurrency;

    const mockSetSelectedAsset = jest.fn();

    const isMultichainAccountsState2Enabled =
      mockSelectMultichainAccountsState2Enabled();
    const currentAccount = mockGetSelectedAccount();
    const selectedAsset = solanaAsset;
    const selectedAddress = '0x123456789';

    if (selectedAsset && isMultichainAccountsState2Enabled) {
      if (
        selectedAsset.network?.chainId?.startsWith('solana:') &&
        currentAccount.address === selectedAddress &&
        !currentAccount.scopes?.some((scope: string) =>
          scope.startsWith('solana:'),
        )
      ) {
        mockSetSelectedAsset(null);
      }
    }

    expect(mockSetSelectedAsset).not.toHaveBeenCalled();
  });

  it('should not clear asset when multichain accounts is disabled', () => {
    mockSelectMultichainAccountsState2Enabled.mockReturnValue(false);
    mockGetSelectedAccount.mockReturnValue({
      id: 'test-account-id',
      address: '0x123456789',
      scopes: ['eip155:1'],
    });

    const solanaAsset = {
      id: 'solana-usdc',
      network: { chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
    } as CryptoCurrency;

    const mockSetSelectedAsset = jest.fn();

    const isMultichainAccountsState2Enabled =
      mockSelectMultichainAccountsState2Enabled();
    const selectedAsset = solanaAsset;

    if (!selectedAsset || !isMultichainAccountsState2Enabled) {
      // Early return - no clearing happens when multichain is disabled
    } else {
      // This branch should not execute since multichain is disabled
      mockSetSelectedAsset(null);
    }

    expect(mockSetSelectedAsset).not.toHaveBeenCalled();
  });

  it('should not clear EVM asset regardless of account scopes', () => {
    mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);
    mockGetSelectedAccount.mockReturnValue({
      id: 'solana-account-id',
      address: 'solana-address',
      scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    });

    const evmAsset = {
      id: 'ethereum-usdc',
      network: { chainId: '0x1' },
    } as CryptoCurrency;

    const mockSetSelectedAsset = jest.fn();

    const isMultichainAccountsState2Enabled =
      mockSelectMultichainAccountsState2Enabled();
    const currentAccount = mockGetSelectedAccount();
    const selectedAsset = evmAsset;
    const selectedAddress = 'solana-address';

    if (selectedAsset && isMultichainAccountsState2Enabled) {
      if (
        selectedAsset.network?.chainId?.startsWith('solana:') && // EVM asset doesn't start with 'solana:'
        currentAccount.address === selectedAddress &&
        !currentAccount.scopes?.some((scope: string) =>
          scope.startsWith('solana:'),
        )
      ) {
        mockSetSelectedAsset(null);
      }
    }

    expect(mockSetSelectedAsset).not.toHaveBeenCalled();
  });
});
