import React, { forwardRef } from 'react';
import { Box } from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { formatPrice } from '../../utils/format';

interface PredictFeeBreakdownSheetProps {
  providerFee: number;
  metamaskFee: number;
  onClose?: () => void;
}

const PredictFeeBreakdownSheet = forwardRef<
  BottomSheetRef,
  PredictFeeBreakdownSheetProps
>(({ providerFee, metamaskFee, onClose }, ref) => (
  <BottomSheet ref={ref} onClose={onClose} shouldNavigateBack={false}>
    <SheetHeader title={strings('predict.fee_summary.fees')} />
    <Box twClassName="px-4 pb-6 flex-col gap-4">
      {/* Provider Fee Row */}
      <Box twClassName="flex-row justify-between items-center">
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {strings('predict.fee_summary.provider_fee_label')}
        </Text>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {formatPrice(providerFee, {
            maximumDecimals: 2,
          })}
        </Text>
      </Box>

      {/* MetaMask Fee Row */}
      <Box twClassName="flex-row justify-between items-center">
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {strings('predict.fee_summary.metamask_fee')}
        </Text>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {formatPrice(metamaskFee, {
            maximumDecimals: 2,
          })}
        </Text>
      </Box>
    </Box>
  </BottomSheet>
));

PredictFeeBreakdownSheet.displayName = 'PredictFeeBreakdownSheet';

export default PredictFeeBreakdownSheet;
