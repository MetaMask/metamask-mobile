import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { usePerpsInlineFeesInfo } from './usePerpsInlineFeesInfo';
import {
  PerpsInlineFeesInfoScreen,
  PerpsInlineOrangeFeesInfoScreen,
} from './PerpsTradeNestedScreens';

jest.mock('./PerpsTradeNestedScreens', () => ({
  PerpsInlineFeesInfoScreen: () => null,
  PerpsInlineOrangeFeesInfoScreen: () => null,
}));

const fees = {
  metamaskFeeRate: 0.0005,
  protocolFeeRate: 0.00045,
  originalMetamaskFeeRate: 0.001,
  feeDiscountPercentage: 50,
  feeSource: 'subscription' as const,
  subscriptionRemainingNotionalUsd: 1000,
};

describe('usePerpsInlineFeesInfo', () => {
  it('renders nothing until the fee breakdown is opened', () => {
    const { result } = renderHook(() => usePerpsInlineFeesInfo(fees, 2000));

    expect(result.current.infoContent).toBeNull();
  });

  it('opens the fee breakdown with the quote and order notional', () => {
    const { result } = renderHook(() => usePerpsInlineFeesInfo(fees, 2000));

    act(() => result.current.showFeesInfo());

    const content = result.current.infoContent as React.ReactElement<
      React.ComponentProps<typeof PerpsInlineFeesInfoScreen>
    >;
    expect(content.type).toBe(PerpsInlineFeesInfoScreen);
    expect(content.props.data).toEqual({ ...fees, orderNotionalUsd: 2000 });
  });

  it('moves between the breakdown, the Orange explainer and the sheet', () => {
    const { result } = renderHook(() => usePerpsInlineFeesInfo(fees));

    act(() => result.current.showFeesInfo());
    const breakdown = result.current.infoContent as React.ReactElement<
      React.ComponentProps<typeof PerpsInlineFeesInfoScreen>
    >;
    act(() => breakdown.props.onOpenOrangeInfo?.());

    const orange = result.current.infoContent as React.ReactElement<
      React.ComponentProps<typeof PerpsInlineOrangeFeesInfoScreen>
    >;
    expect(orange.type).toBe(PerpsInlineOrangeFeesInfoScreen);

    act(() => orange.props.onBack());
    const backToBreakdown = result.current.infoContent as React.ReactElement<
      React.ComponentProps<typeof PerpsInlineFeesInfoScreen>
    >;
    expect(backToBreakdown.type).toBe(PerpsInlineFeesInfoScreen);

    act(() => backToBreakdown.props.onBack());
    expect(result.current.infoContent).toBeNull();
  });
});
