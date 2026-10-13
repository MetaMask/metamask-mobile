import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import React, { useCallback, useMemo, useRef } from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  ButtonsAlignment,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';

interface PerpsCrossMarginWarningBottomSheetProps {
  sheetRef?: React.RefObject<BottomSheetRef | null>;
  onClose?: () => void;
}

const PerpsCrossMarginWarningBottomSheet: React.FC<
  PerpsCrossMarginWarningBottomSheetProps
> = ({ sheetRef: externalSheetRef, onClose: onExternalClose }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;

  const handleClose = useCallback(() => {
    if (onExternalClose) {
      onExternalClose();
    } else {
      navigation.goBack();
    }
  }, [navigation, onExternalClose]);

  const handleDismiss = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.crossMargin.dismiss'),
      onPress: handleDismiss,
      size: ButtonSize.Lg,
    }),
    [handleDismiss],
  );

  return (
    <BottomSheet ref={sheetRef} onClose={handleClose}>
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: 'header-close-button' }}
      >
        {strings('perps.crossMargin.title')}
      </BottomSheetHeader>
      <Box twClassName="px-4 py-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.crossMargin.message')}
        </Text>
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        primaryButtonProps={primaryButtonProps}
      />
    </BottomSheet>
  );
};

export default PerpsCrossMarginWarningBottomSheet;
