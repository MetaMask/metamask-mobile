import React, { forwardRef, useCallback } from 'react';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { Asset } from '../../../../Views/confirmations/components/send/asset/asset';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { usePredictBalanceTokenFilter } from '../../hooks/usePredictBalanceTokenFilter';
import { PaymentToken } from '../../hooks/usePredictPaymentToken';
import { strings } from '../../../../../../locales/i18n';

interface PredictTokenPickerSheetProps {
  selectedToken: PaymentToken;
  predictBalance: number;
  onSelectToken: (asset: AssetType) => void;
  onClose: () => void;
}

const PredictTokenPickerSheet = forwardRef<
  BottomSheetRef,
  PredictTokenPickerSheetProps
>(({ selectedToken, predictBalance, onSelectToken, onClose }, ref) => {
  const isPredictBalanceSelected = selectedToken.isPredictBalance;

  const tokenFilter = usePredictBalanceTokenFilter({
    predictBalance,
    isPredictBalanceSelected,
  });

  const handleTokenSelect = useCallback(
    (asset: AssetType) => {
      onSelectToken(asset);
      onClose();
    },
    [onSelectToken, onClose],
  );

  return (
    <BottomSheet
      ref={ref}
      onClose={onClose}
      shouldNavigateBack={false}
      isFullscreen
    >
      <Text variant={TextVariant.HeadingSm} twClassName="px-4 pt-4 pb-2">
        {strings('predict.order.select_token')}
      </Text>
      <Asset
        includeNoBalance={false}
        hideNfts
        tokenFilter={tokenFilter}
        onTokenSelect={handleTokenSelect}
        hideNetworkFilter
      />
    </BottomSheet>
  );
});

PredictTokenPickerSheet.displayName = 'PredictTokenPickerSheet';

export default PredictTokenPickerSheet;
