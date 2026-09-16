import { renderHook, act } from '@testing-library/react-native';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { Hex } from '@metamask/utils';
import Logger from '../../../../util/Logger';
import { selectIsAssetsUnifyStateEnabled } from '../../../../selectors/featureFlagController/assetsUnifyState';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectEnabledNetworks } from '../../../../selectors/networkEnablementController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { useRefreshTokens } from './useRefreshTokens';

const mockGetAssets = jest.fn().mockResolvedValue({});
const mockUpdateBalance = jest.fn().mockResolvedValue(undefined);
const mockPerformEvmTokenRefresh = jest.fn().mockResolvedValue(undefined);

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: (state: Record<string, never>) => unknown) =>
    selector({}),
  ),
}));

jest.mock(
  '../../../../selectors/featureFlagController/assetsUnifyState',
  () => ({
    selectIsAssetsUnifyStateEnabled: jest.fn(),
  }),
);

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupInternalAccounts: jest.fn(),
  }),
);

jest.mock('../../../../selectors/networkEnablementController', () => ({
  selectEnabledNetworks: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    AssetsController: {
      getAssets: (...args: unknown[]) => mockGetAssets(...args),
    },
    MultichainBalancesController: {
      updateBalance: (...args: unknown[]) => mockUpdateBalance(...args),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../util/tokenRefreshUtils', () => ({
  performEvmTokenRefresh: (...args: unknown[]) =>
    mockPerformEvmTokenRefresh(...args),
}));

jest.mock('../../../../core/Assets/accountGroupAssetLoader', () => ({
  FUNGIBLE_ASSET_TYPES: ['fungible'],
}));

const SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const BITCOIN_CHAIN_ID = 'bip122:000000000019d6689c085ae165831e93';

const evmNetworkConfigurationsByChainId = {
  '0x1': { chainId: '0x1' as Hex, nativeCurrency: 'ETH' },
  '0x89': { chainId: '0x89' as Hex, nativeCurrency: 'POL' },
};

const makeAccount = (
  id: string,
  type: InternalAccount['type'] = 'eip155:eoa',
): InternalAccount => ({ id, address: '0xabc', type }) as InternalAccount;

const evmAccount = makeAccount('evm-account');
const solAccount = makeAccount('sol-account', 'solana:data-account');
const btcAccount = makeAccount('btc-account', 'bip122:p2wpkh');

describe('useRefreshTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      true,
    );
    (
      selectSelectedAccountGroupInternalAccounts as unknown as jest.Mock
    ).mockReturnValue([evmAccount, solAccount, btcAccount]);
    (selectEnabledNetworks as unknown as jest.Mock).mockReturnValue([
      'eip155:1',
      'eip155:137',
      SOLANA_CHAIN_ID,
      BITCOIN_CHAIN_ID,
    ]);
    (
      selectEvmNetworkConfigurationsByChainId as unknown as jest.Mock
    ).mockReturnValue(evmNetworkConfigurationsByChainId);
  });

  it('calls AssetsController.getAssets with selected group accounts and all enabled chains when unified assets are enabled', async () => {
    const { result } = renderHook(() => useRefreshTokens());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetAssets).toHaveBeenCalledTimes(1);
    expect(mockGetAssets).toHaveBeenCalledWith(
      [evmAccount, solAccount, btcAccount],
      {
        forceUpdate: true,
        chainIds: ['eip155:1', 'eip155:137', SOLANA_CHAIN_ID, BITCOIN_CHAIN_ID],
        assetTypes: ['fungible'],
      },
    );
    expect(mockPerformEvmTokenRefresh).not.toHaveBeenCalled();
    expect(mockUpdateBalance).not.toHaveBeenCalled();
  });

  it('refreshes via the legacy token controllers when unified assets state is disabled', async () => {
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      false,
    );
    const { result } = renderHook(() => useRefreshTokens());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetAssets).not.toHaveBeenCalled();
    expect(mockUpdateBalance).toHaveBeenCalledTimes(2);
    expect(mockUpdateBalance).toHaveBeenCalledWith('sol-account');
    expect(mockUpdateBalance).toHaveBeenCalledWith('btc-account');
    expect(mockPerformEvmTokenRefresh).toHaveBeenCalledTimes(1);
    expect(mockPerformEvmTokenRefresh).toHaveBeenCalledWith(
      evmNetworkConfigurationsByChainId,
    );
  });

  it('does not call MultichainBalancesController.updateBalance for EVM-only groups when unified assets state is disabled', async () => {
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      false,
    );
    (
      selectSelectedAccountGroupInternalAccounts as unknown as jest.Mock
    ).mockReturnValue([evmAccount]);
    const { result } = renderHook(() => useRefreshTokens());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetAssets).not.toHaveBeenCalled();
    expect(mockUpdateBalance).not.toHaveBeenCalled();
    expect(mockPerformEvmTokenRefresh).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the selected group has no accounts and unified assets are enabled', async () => {
    (
      selectSelectedAccountGroupInternalAccounts as unknown as jest.Mock
    ).mockReturnValue([]);
    const { result } = renderHook(() => useRefreshTokens());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetAssets).not.toHaveBeenCalled();
    expect(mockPerformEvmTokenRefresh).not.toHaveBeenCalled();
    expect(mockUpdateBalance).not.toHaveBeenCalled();
  });

  it('logs when AssetsController.getAssets rejects', async () => {
    mockGetAssets.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useRefreshTokens());

    await act(async () => {
      await result.current.refresh();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'useRefreshTokens: AssetsController.getAssets failed',
    );
  });

  it('logs and continues when MultichainBalancesController.updateBalance rejects', async () => {
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      false,
    );
    mockUpdateBalance.mockRejectedValueOnce(new Error('rpc'));
    const { result } = renderHook(() => useRefreshTokens());

    await act(async () => {
      await result.current.refresh();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'useRefreshTokens: failed to refresh balance for non-EVM account sol-account',
    );
    expect(mockPerformEvmTokenRefresh).toHaveBeenCalledTimes(1);
  });
});
