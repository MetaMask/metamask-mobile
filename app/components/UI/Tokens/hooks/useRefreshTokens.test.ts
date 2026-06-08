import { renderHook, act } from '@testing-library/react-native';
import { BtcScope, EthScope, SolScope } from '@metamask/keyring-api';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import type { Hex } from '@metamask/utils';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import Logger from '../../../../util/Logger';
import { selectIsAssetsUnifyStateEnabled } from '../../../../selectors/featureFlagController/assetsUnifyState';
import { useRefreshTokens } from './useRefreshTokens';

const mockGetAssets = jest.fn().mockResolvedValue({});
const mockUpdateBalance = jest.fn().mockResolvedValue(undefined);
const mockPerformEvmTokenRefresh = jest.fn().mockResolvedValue(undefined);
const mockAccountByScope = jest.fn();

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

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => mockAccountByScope),
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

const evmNetworkConfigurationsByChainId = {
  '0x1': { chainId: '0x1' as Hex, nativeCurrency: 'ETH' },
  '0x89': { chainId: '0x89' as Hex, nativeCurrency: 'POL' },
} as const;

const makeAccount = (id: string): InternalAccount =>
  ({ id, address: '0xabc', type: 'eip155:eoa' }) as InternalAccount;

describe('useRefreshTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      true,
    );
    mockAccountByScope.mockImplementation((scope: unknown) => {
      if (scope === EthScope.Mainnet) {
        return makeAccount('evm-account');
      }
      if (scope === SolScope.Mainnet) {
        return makeAccount('sol-account');
      }
      if (scope === BtcScope.Mainnet) {
        return makeAccount('btc-account');
      }
      return undefined;
    });
  });

  it('calls AssetsController.getAssets with chain ids and fungible asset types when unified assets are enabled', async () => {
    const { result } = renderHook(() =>
      useRefreshTokens({
        evmNetworkConfigurationsByChainId,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    const expectedChainIds = Object.values(
      evmNetworkConfigurationsByChainId,
    ).map((config) => toEvmCaipChainId(config.chainId));

    expect(mockGetAssets).toHaveBeenCalledTimes(1);
    expect(mockGetAssets).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'evm-account' }),
        expect.objectContaining({ id: 'sol-account' }),
        expect.objectContaining({ id: 'btc-account' }),
      ]),
      {
        forceUpdate: true,
        chainIds: expectedChainIds,
        assetTypes: ['fungible'],
      },
    );
    expect(mockPerformEvmTokenRefresh).not.toHaveBeenCalled();
    expect(mockUpdateBalance).not.toHaveBeenCalled();
  });

  it('skips AssetsController.getAssets when unified assets state is disabled', async () => {
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      false,
    );
    const { result } = renderHook(() =>
      useRefreshTokens({
        evmNetworkConfigurationsByChainId,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetAssets).not.toHaveBeenCalled();
    expect(mockPerformEvmTokenRefresh).toHaveBeenCalledWith(
      evmNetworkConfigurationsByChainId,
    );
  });

  it('skips AssetsController.getAssets when no scoped accounts exist', async () => {
    mockAccountByScope.mockReturnValue(undefined);
    const { result } = renderHook(() =>
      useRefreshTokens({
        evmNetworkConfigurationsByChainId,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetAssets).not.toHaveBeenCalled();
    expect(mockPerformEvmTokenRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not call MultichainBalancesController.updateBalance when the group has no Solana or Bitcoin scoped account', async () => {
    mockAccountByScope.mockImplementation((scope: unknown) => {
      if (scope === EthScope.Mainnet) {
        return makeAccount('evm-only');
      }
      return undefined;
    });

    const { result } = renderHook(() =>
      useRefreshTokens({
        evmNetworkConfigurationsByChainId,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetAssets).toHaveBeenCalledTimes(1);
    expect(mockGetAssets).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'evm-only' })],
      expect.objectContaining({
        forceUpdate: true,
        assetTypes: ['fungible'],
      }),
    );
    expect(mockUpdateBalance).not.toHaveBeenCalled();
    expect(mockPerformEvmTokenRefresh).not.toHaveBeenCalled();
  });

  it('calls MultichainBalancesController.updateBalance for each present non-EVM scoped account when unified assets state is disabled', async () => {
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      false,
    );
    mockAccountByScope.mockImplementation((scope: unknown) => {
      if (scope === EthScope.Mainnet) {
        return makeAccount('evm-1');
      }
      if (scope === SolScope.Mainnet) {
        return makeAccount('sol-1');
      }
      if (scope === BtcScope.Mainnet) {
        return undefined;
      }
      return undefined;
    });

    const { result } = renderHook(() =>
      useRefreshTokens({
        evmNetworkConfigurationsByChainId,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetAssets).not.toHaveBeenCalled();
    expect(mockUpdateBalance).toHaveBeenCalledTimes(1);
    expect(mockUpdateBalance).toHaveBeenCalledWith('sol-1');
    expect(mockPerformEvmTokenRefresh).toHaveBeenCalledTimes(1);
  });

  it('logs and continues when AssetsController.getAssets rejects', async () => {
    mockGetAssets.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() =>
      useRefreshTokens({
        evmNetworkConfigurationsByChainId,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'useRefreshTokens: AssetsController.getAssets failed',
    );
    expect(mockPerformEvmTokenRefresh).not.toHaveBeenCalled();
    expect(mockUpdateBalance).not.toHaveBeenCalled();
  });

  it('logs per-account errors when MultichainBalancesController.updateBalance rejects', async () => {
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      false,
    );
    mockUpdateBalance.mockRejectedValueOnce(new Error('sol-down'));
    mockAccountByScope.mockImplementation((scope: unknown) => {
      if (scope === EthScope.Mainnet) {
        return makeAccount('evm-1');
      }
      if (scope === SolScope.Mainnet) {
        return makeAccount('sol-1');
      }
      return undefined;
    });

    const { result } = renderHook(() =>
      useRefreshTokens({
        evmNetworkConfigurationsByChainId,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'useRefreshTokens: failed to refresh balance for non-EVM account sol-1',
    );
    expect(mockPerformEvmTokenRefresh).toHaveBeenCalledTimes(1);
    expect(mockGetAssets).not.toHaveBeenCalled();
  });
});
