import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import React, { useCallback, useMemo, useRef } from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  ButtonSize,
  ButtonsAlignment,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

interface PerpsCrossMarginWarningBottomSheetProps {
  sheetRef?: React.RefObject<BottomSheetRef | null>;
  onClose?: () => void;
}

const PerpsCrossMarginWarningBottomSheet: React.FC<
  PerpsCrossMarginWarningBottomSheetProps
> = ({ sheetRef: externalSheetRef, onClose: onExternalClose }) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
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
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={handleClose}
        closeButtonProps={{ testID: 'header-close-button' }}
      >
        {strings('perps.crossMargin.title')}
      </BottomSheetHeaderGlass>
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
