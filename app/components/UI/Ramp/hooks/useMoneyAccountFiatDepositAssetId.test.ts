import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useMoneyAccountFiatDepositAssetId } from './useMoneyAccountFiatDepositAssetId';
import { MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID } from '../utils/getMoneyAccountFiatDepositAssetId';

/**
 * Build a minimal Redux store whose RemoteFeatureFlagController contains the
 * given `confirmations_pay_fiat` payload.
 */
function makeStore(confirmationsPayFiat?: Record<string, unknown>) {
  return configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: confirmationsPayFiat
              ? { confirmations_pay_fiat: confirmationsPayFiat }
              : {},
            localOverrides: {},
            cacheTimestamp: 0,
          },
        },
      }),
    },
  });
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store } as never, children);
}

describe('useMoneyAccountFiatDepositAssetId', () => {
  it('returns ETH mainnet fallback constant when flag is absent', () => {
    const store = makeStore();
    const { result } = renderHook(() => useMoneyAccountFiatDepositAssetId(), {
      wrapper: makeWrapper(store),
    });

    expect(result.current).toBe(MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID);
    expect(result.current).toBe('eip155:1/slip44:60');
  });

  it('returns erc20 CAIP-19 asset id when flag sets an ERC-20 address', () => {
    const store = makeStore({
      assetPerTransactionType: {
        moneyAccountDeposit: {
          address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
          chainId: '0x1',
        },
      },
    });
    const { result } = renderHook(() => useMoneyAccountFiatDepositAssetId(), {
      wrapper: makeWrapper(store),
    });

    // eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da
    expect(result.current).toBe(
      'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
    );
  });

  it('returns slip44:60 CAIP-19 asset id when flag sets the native token address (zero address)', () => {
    const store = makeStore({
      assetPerTransactionType: {
        moneyAccountDeposit: {
          address: '0x0000000000000000000000000000000000000000',
          chainId: '0x89', // Polygon
        },
      },
    });
    const { result } = renderHook(() => useMoneyAccountFiatDepositAssetId(), {
      wrapper: makeWrapper(store),
    });

    // chain ref = decimal of 0x89 = 137
    expect(result.current).toBe('eip155:137/slip44:60');
  });

  it('returns slip44:60 when flag sets a native token on a non-mainnet chain', () => {
    const store = makeStore({
      assetPerTransactionType: {
        moneyAccountDeposit: {
          address: '0x0000000000000000000000000000000000000000',
          chainId: '0xa', // Optimism (decimal 10)
        },
      },
    });
    const { result } = renderHook(() => useMoneyAccountFiatDepositAssetId(), {
      wrapper: makeWrapper(store),
    });

    expect(result.current).toBe('eip155:10/slip44:60');
  });

  it('falls back to the ETH mainnet constant when assetPerTransactionType is present but moneyAccountDeposit key is absent', () => {
    const store = makeStore({
      assetPerTransactionType: {
        // only other tx types present, not moneyAccountDeposit
        simpleSend: {
          address: '0xabc',
          chainId: '0x1',
        },
      },
    });
    const { result } = renderHook(() => useMoneyAccountFiatDepositAssetId(), {
      wrapper: makeWrapper(store),
    });

    expect(result.current).toBe(MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID);
  });
});
