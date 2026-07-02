import { renderHook } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { useBridgeViewRouteFallbacks } from './useBridgeViewRouteFallbacks';
import { BridgeToken } from '../../types';

const ETH: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'ETH',
};

const USDC: BridgeToken = {
  address: '0xA0b86991c6218b36c1D19D4a2e9Eb0cE3606eB48',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
};

const DAI: BridgeToken = {
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'DAI',
};

describe('useBridgeViewRouteFallbacks', () => {
  it('reports synced when Redux tokens and amount match the displayed values', () => {
    // Arrange + Act
    const { result } = renderHook(() =>
      useBridgeViewRouteFallbacks({
        sourceToken: ETH,
        destToken: USDC,
        sourceAmount: '5',
      }),
    );

    // Assert
    expect(result.current.displaySourceToken).toBe(ETH);
    expect(result.current.displaySourceAmount).toBe('5');
    expect(result.current.displayDestToken).toBe(USDC);
    expect(result.current.areDisplayedTokensSyncedWithRedux).toBe(true);
  });

  it('is NOT synced while the displayed source amount differs from Redux, even when both tokens already match', () => {
    // Arrange: "same token, new amount" prefill — Redux source token already
    // equals the initial token, but Redux still holds the older amount.
    // Act
    const { result } = renderHook(() =>
      useBridgeViewRouteFallbacks({
        sourceToken: ETH,
        destToken: USDC,
        sourceAmount: '2', // stale Redux amount
        initialSourceToken: ETH,
        initialSourceAmount: '5', // prefilled amount not yet in Redux
        initialDestToken: USDC,
      }),
    );

    // Assert: the displayed amount is the prefilled value...
    expect(result.current.displaySourceAmount).toBe('5');
    // ...but the gate must stay closed so quote/footer UI does not unlock with a
    // quote computed for the stale Redux amount ('2').
    expect(result.current.areDisplayedTokensSyncedWithRedux).toBe(false);
  });

  it('becomes synced once Redux catches up to the prefilled amount', () => {
    // Arrange
    const { result, rerender } = renderHook(
      (props: {
        sourceToken?: BridgeToken;
        destToken?: BridgeToken;
        sourceAmount?: string;
        initialSourceToken?: BridgeToken;
        initialSourceAmount?: string;
        initialDestToken?: BridgeToken;
      }) => useBridgeViewRouteFallbacks(props),
      {
        initialProps: {
          sourceToken: ETH,
          destToken: USDC,
          sourceAmount: '2',
          initialSourceToken: ETH,
          initialSourceAmount: '5',
          initialDestToken: USDC,
        },
      },
    );

    expect(result.current.areDisplayedTokensSyncedWithRedux).toBe(false);

    // Act: Redux source amount catches up to the prefilled amount.
    rerender({
      sourceToken: ETH,
      destToken: USDC,
      sourceAmount: '5',
      initialSourceToken: ETH,
      initialSourceAmount: '5',
      initialDestToken: USDC,
    });

    // Assert
    expect(result.current.displaySourceAmount).toBe('5');
    expect(result.current.areDisplayedTokensSyncedWithRedux).toBe(true);
  });

  it('stays synced when there is no prefilled amount (common navigation path)', () => {
    // Arrange + Act: initialSourceAmount is undefined, so the displayed amount
    // always tracks Redux and the amount check must not close the gate.
    const { result } = renderHook(() =>
      useBridgeViewRouteFallbacks({
        sourceToken: ETH,
        destToken: USDC,
        sourceAmount: '2',
        initialSourceToken: ETH,
        initialDestToken: USDC,
      }),
    );

    // Assert
    expect(result.current.displaySourceAmount).toBe('2');
    expect(result.current.areDisplayedTokensSyncedWithRedux).toBe(true);
  });

  it('is NOT synced while the displayed source token differs from Redux', () => {
    // Arrange + Act: Redux source token has not yet caught up to the prefill.
    const { result } = renderHook(() =>
      useBridgeViewRouteFallbacks({
        sourceToken: DAI, // Redux still on the previous token
        destToken: USDC,
        sourceAmount: '5',
        initialSourceToken: ETH,
        initialSourceAmount: '5',
        initialDestToken: USDC,
      }),
    );

    // Assert: the prefilled token is displayed and the gate stays closed.
    expect(result.current.displaySourceToken).toBe(ETH);
    expect(result.current.areDisplayedTokensSyncedWithRedux).toBe(false);
  });
});
