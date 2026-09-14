import React from 'react';
import { Text } from 'react-native';
import { act, render, renderHook } from '@testing-library/react-native';
import { FeatureId } from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';

import { useBridgeSession } from '../Bridge/hooks/useBridgeSession';
import { useSwapsFeatureId } from '../Bridge/hooks/useSwapsFeatureId';
import { BridgeTabKey } from '../Bridge/Views/BridgeView/BridgeView.constants';
import {
  QuickBuyQuotesSession,
  useSetQuickBuyQuoteParams,
} from './QuickBuyQuotesSession';

const srcToken = {
  address: '0x1111111111111111111111111111111111111111',
  decimals: 18,
  chainId: '0x1' as Hex,
  symbol: 'ETH',
};

describe('QuickBuyQuotesSession', () => {
  it('keeps selectedTab and renderedTab on Market', () => {
    const { result } = renderHook(
      () => ({
        session: useBridgeSession(),
        featureId: useSwapsFeatureId(),
      }),
      {
        wrapper: ({ children }) => (
          <QuickBuyQuotesSession featureId={FeatureId.QUICK_BUY_FOLLOW_TRADING}>
            {children}
          </QuickBuyQuotesSession>
        ),
      },
    );

    expect(result.current.session.selectedTab).toBe(BridgeTabKey.Market);
    expect(result.current.session.renderedTab).toBe(BridgeTabKey.Market);
    expect(result.current.featureId).toBe(FeatureId.QUICK_BUY_FOLLOW_TRADING);
  });

  it('starts with empty quoteParams', () => {
    const { result } = renderHook(() => useBridgeSession(), {
      wrapper: ({ children }) => (
        <QuickBuyQuotesSession featureId={FeatureId.QUICK_BUY_EXPLORE}>
          {children}
        </QuickBuyQuotesSession>
      ),
    });

    expect(result.current.quoteParams).toEqual({
      srcToken: undefined,
      destToken: undefined,
      srcAmount: undefined,
      slippage: undefined,
      walletAddress: undefined,
      destWalletAddress: undefined,
    });
  });

  it('updates quoteParams when setQuoteParams is called', () => {
    const { result } = renderHook(
      () => ({
        session: useBridgeSession(),
        setQuoteParams: useSetQuickBuyQuoteParams(),
      }),
      {
        wrapper: ({ children }) => (
          <QuickBuyQuotesSession featureId={FeatureId.QUICK_BUY_TOKEN_DETAILS}>
            {children}
          </QuickBuyQuotesSession>
        ),
      },
    );

    act(() => {
      result.current.setQuoteParams({
        srcToken,
        destToken: srcToken,
        srcAmount: '1.25',
        slippage: '0.5',
        walletAddress: '0xabc',
        destWalletAddress: '0xdef',
      });
    });

    expect(result.current.session.quoteParams).toEqual({
      srcToken,
      destToken: srcToken,
      srcAmount: '1.25',
      slippage: '0.5',
      walletAddress: '0xabc',
      destWalletAddress: '0xdef',
    });
  });

  it('no-ops setQuoteParams outside the session', () => {
    const { result } = renderHook(() => useSetQuickBuyQuoteParams());

    expect(() =>
      result.current({
        srcAmount: '1',
      }),
    ).not.toThrow();
  });

  it('renders children', () => {
    const { getByText } = render(
      <QuickBuyQuotesSession featureId={FeatureId.QUICK_BUY_EXPLORE}>
        <Text>hosted</Text>
      </QuickBuyQuotesSession>,
    );

    expect(getByText('hosted')).toBeOnTheScreen();
  });
});
