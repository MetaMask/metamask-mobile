import React, { useCallback, useMemo, useState } from 'react';
import type { OrderFeesResult } from '../../hooks/usePerpsOrderFees';
import {
  PerpsInlineFeesInfoScreen,
  PerpsInlineOrangeFeesInfoScreen,
} from './PerpsTradeNestedScreens';

type PerpsInlineFeesInfoFees = Pick<
  OrderFeesResult,
  | 'metamaskFeeRate'
  | 'protocolFeeRate'
  | 'originalMetamaskFeeRate'
  | 'feeDiscountPercentage'
  | 'feeSource'
  | 'subscriptionRemainingNotionalUsd'
>;

/**
 * Fee breakdown (and the Orange fees explainer it links to) shown in place of
 * a bottom sheet's own content, as the adjust margin sheet does for its
 * explainers, instead of stacking another sheet.
 *
 * @param fees - The fee quote the sheet's Fees row shows.
 * @param orderNotionalUsd - Order notional (USD) the quote is for.
 * @returns `showFeesInfo` for the Fees row, and `infoContent` to render
 * inside the sheet instead of its content while it is set.
 */
export const usePerpsInlineFeesInfo = (
  fees: PerpsInlineFeesInfoFees,
  orderNotionalUsd?: number,
) => {
  const [screen, setScreen] = useState<'fees' | 'orangeFees' | null>(null);
  const showFeesInfo = useCallback(() => setScreen('fees'), []);
  const showOrangeFeesInfo = useCallback(() => setScreen('orangeFees'), []);
  const hideInfo = useCallback(() => setScreen(null), []);

  const {
    metamaskFeeRate,
    protocolFeeRate,
    originalMetamaskFeeRate,
    feeDiscountPercentage,
    feeSource,
    subscriptionRemainingNotionalUsd,
  } = fees;

  const infoContent = useMemo(() => {
    if (screen === 'orangeFees') {
      return <PerpsInlineOrangeFeesInfoScreen onBack={showFeesInfo} />;
    }
    if (screen === 'fees') {
      return (
        <PerpsInlineFeesInfoScreen
          data={{
            metamaskFeeRate,
            protocolFeeRate,
            originalMetamaskFeeRate,
            feeDiscountPercentage,
            feeSource,
            orderNotionalUsd,
            subscriptionRemainingNotionalUsd,
          }}
          onBack={hideInfo}
          onOpenOrangeInfo={showOrangeFeesInfo}
        />
      );
    }
    return null;
  }, [
    screen,
    showFeesInfo,
    hideInfo,
    showOrangeFeesInfo,
    metamaskFeeRate,
    protocolFeeRate,
    originalMetamaskFeeRate,
    feeDiscountPercentage,
    feeSource,
    orderNotionalUsd,
    subscriptionRemainingNotionalUsd,
  ]);

  return { showFeesInfo, infoContent };
};
