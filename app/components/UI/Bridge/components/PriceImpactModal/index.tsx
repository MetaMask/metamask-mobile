import React, { useCallback, useMemo, useRef, useState } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { getPriceImpactViewData } from '../../utils/getPriceImpactViewData';
import { PriceImpactModalRouterParams } from './types';
import { useParams } from '../../../../../util/navigation/navUtils';
import { PriceImpactHeader } from './PriceImpactHeader';
import { PriceImpactDescription } from './PriceImpactDescription';
import { PriceImpactFooter } from './PriceImpactFooter';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { useBridgeConfirm } from '../../hooks/useBridgeConfirm';
import { useModalCloseOnQuoteExpiry } from '../../hooks/useModalCloseOnQuoteExpiry';

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

  const { formattedQuoteData } = useBridgeQuoteData();

  const priceImpactViewData = useMemo(
    () => getPriceImpactViewData(formattedQuoteData?.priceImpact),
    [formattedQuoteData?.priceImpact],
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleProceed = useCallback(async () => {
    setLoading(true);
    await confirmBridge();
  }, [confirmBridge]);

  const warningIcon = priceImpactViewData.icon;

  useModalCloseOnQuoteExpiry();

  return (
    <BottomSheet ref={sheetRef}>
      <PriceImpactHeader
        type={type}
        onClose={handleClose}
        warningIconName={warningIcon?.name}
        warningIconColor={warningIcon?.color}
      />
      <PriceImpactDescription
        type={type}
        priceImpact={warningIcon ? formattedQuoteData?.priceImpact : undefined}
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
