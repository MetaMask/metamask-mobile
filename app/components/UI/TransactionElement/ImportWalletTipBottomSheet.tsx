import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  type BottomSheetRef,
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { strings } from '../../../../locales/i18n';

const ImportWalletTipBottomSheet = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <BottomSheet ref={bottomSheetRef} goBack={handleGoBack}>
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
