import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { PriceImpactModalRouterParams } from './types';
import { useParams } from '../../../../../util/navigation/navUtils';
import { PriceImpactHeader } from './PriceImpactHeader';
import { PriceImpactDescription } from './PriceImpactDescription';
import { PriceImpactFooter } from './PriceImpactFooter';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { useBridgeConfirm } from '../../hooks/useBridgeConfirm';
import { usePriceImpactViewData } from '../../hooks/usePriceImpactViewData';
import {
  exceedsPriceImpactErrorThreshold,
  parsePriceImpact,
} from '../../utils/getPriceImpactViewData';
import { selectBridgeFeatureFlags } from '../../../../../core/redux/slices/bridge';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetRef,
} from '@metamask/design-system-react-native';

export const PriceImpactModal = () => {
  const { goBack } = useNavigation();
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
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

  const isDangerousPriceImpact = useMemo(
    () =>
      exceedsPriceImpactErrorThreshold(
        parsePriceImpact(activeQuote?.quote.priceData?.priceImpact),
        bridgeFeatureFlags?.priceImpactThreshold?.error,
      ),
    [activeQuote, bridgeFeatureFlags],
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleProceed = useCallback(async () => {
    setLoading(true);
    await confirmBridge();
  }, [confirmBridge]);

  return (
    <BottomSheet ref={sheetRef} goBack={goBack}>
      <PriceImpactHeader
        onClose={handleClose}
        iconName={priceImpactViewData.icon?.name}
        iconColor={priceImpactViewData.icon?.color}
        content={priceImpactViewData.title}
      />
      <PriceImpactDescription
        formattedPriceImpact={formattedQuoteData?.priceImpact}
        content={priceImpactViewData.description}
        isDanger={isDangerousPriceImpact}
        formattedPriceImpactFiat={formattedQuoteData?.priceImpactFiat}
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
