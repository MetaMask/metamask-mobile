import React, { useCallback, useRef, useState } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { PriceImpactModalRouterParams } from './types';
import { useParams } from '../../../../../util/navigation/navUtils';
import { PriceImpactHeader } from './PriceImpactHeader';
import { PriceImpactDescription } from './PriceImpactDescription';
import { PriceImpactFooter } from './PriceImpactFooter';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { useBridgeConfirm } from '../../hooks/useBridgeConfirm';
import { usePriceImpactViewData } from '../../hooks/usePriceImpactViewData';

export const PriceImpactModal = () => {
  const [loading, setLoading] = useState(false);
  const { type, token, location } = useParams<PriceImpactModalRouterParams>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const tokenBalance = useLatestBalance({
    address: token?.address,
    decimals: token?.decimals,
    chainId: token?.chainId,
  });

  const confirmBridge = useBridgeConfirm({
    latestSourceBalance: tokenBalance,
    location,
  });

  const { formattedQuoteData, activeQuote } = useBridgeQuoteData();
  const priceImpactViewData = usePriceImpactViewData(
    activeQuote?.quote.priceData?.priceImpact,
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleProceed = useCallback(async () => {
    setLoading(true);
    await confirmBridge();
  }, [confirmBridge]);

  return (
    <BottomSheet ref={sheetRef}>
      <PriceImpactHeader
        onClose={handleClose}
        iconName={priceImpactViewData.icon?.name}
        iconColor={priceImpactViewData.icon?.color}
        content={priceImpactViewData.title}
      />
      <PriceImpactDescription
        formattedPriceImpact={formattedQuoteData?.priceImpact}
        content={priceImpactViewData.description}
      />
      <PriceImpactFooter
        type={type}
        onConfirm={handleClose}
        onCancel={handleProceed}
        loading={loading}
      />
    </BottomSheet>
  );
};
