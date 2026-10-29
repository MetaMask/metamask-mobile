import React, { useRef } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';

const ImportWalletTipBottomSheet = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  return (
    <BottomSheet ref={bottomSheetRef}>
      <Box twClassName="px-4 pt-6 pb-2 items-center">
        <Text variant={TextVariant.HeadingMd} testID="import-wallet-tip-title">
          {strings('transactions.import_wallet_label')}
        </Text>
      </Box>
      <Box twClassName="px-4 py-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('transactions.import_wallet_tip')}
        </Text>
      </Box>
    </BottomSheet>
  );
};

export default ImportWalletTipBottomSheet;
