import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { createStyles } from './PerpsCrossMarginWarningBottomSheet.styles';
import { useTheme } from '../../../../../util/theme';

interface PerpsCrossMarginWarningBottomSheetProps {
  sheetRef?: React.RefObject<BottomSheetRef>;
  onClose?: () => void;
}

const PerpsCrossMarginWarningBottomSheet: React.FC<
  PerpsCrossMarginWarningBottomSheetProps
> = ({ sheetRef: externalSheetRef, onClose: onExternalClose }) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();
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

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={handleClose}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.crossMargin.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.contentContainer}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('perps.crossMargin.message')}
        </Text>
      </View>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={[
          {
            label: strings('perps.crossMargin.dismiss'),
            onPress: handleDismiss,
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
          },
        ]}
      />
    </BottomSheet>
  );
};

export default PerpsCrossMarginWarningBottomSheet;
