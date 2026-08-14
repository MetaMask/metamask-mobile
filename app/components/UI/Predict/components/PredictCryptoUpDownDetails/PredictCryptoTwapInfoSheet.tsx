import React, { forwardRef } from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../../locales/i18n';
import type { CryptoTwapWindowSeconds } from '../../types';

interface PredictCryptoTwapInfoSheetProps {
  windowSeconds: CryptoTwapWindowSeconds;
  symbol: string;
  onClose?: () => void;
}

const PredictCryptoTwapInfoSheet = forwardRef<
  BottomSheetRef,
  PredictCryptoTwapInfoSheetProps
>(({ windowSeconds, symbol, onClose }, ref) => (
  <BottomSheet ref={ref} onClose={onClose} shouldNavigateBack={false}>
    <SheetHeader title={strings('predict.crypto_up_down.twap_info.title')} />
    <Box twClassName="px-4 pb-4 gap-3">
      <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
        {strings('predict.crypto_up_down.twap_info.description', {
          symbol,
          windowSeconds,
        })}
      </Text>
      <Text color={TextColor.TextAlternative} variant={TextVariant.BodySm}>
        {strings('predict.market_details.disclaimer')}
      </Text>
    </Box>
  </BottomSheet>
));

PredictCryptoTwapInfoSheet.displayName = 'PredictCryptoTwapInfoSheet';

export default PredictCryptoTwapInfoSheet;
