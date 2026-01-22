import React, { useRef, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import createStyles from './PerpsProviderSelector.styles';
import type { PerpsProviderSwitchWarningProps } from './PerpsProviderSelector.types';

/**
 * Warning modal shown when switching providers with open positions
 */
const PerpsProviderSwitchWarning: React.FC<PerpsProviderSwitchWarningProps> = ({
  isVisible,
  onClose,
  onConfirm,
  fromProvider,
  toProvider,
  openPositionsCount,
  testID,
}) => {
  const { styles } = useStyles(createStyles, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleCancel = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm();
    bottomSheetRef.current?.onCloseBottomSheet();
  }, [onConfirm]);

  if (!isVisible) {
    return null;
  }

  const footerButtons = [
    {
      label: strings('perps.provider_selector.warning.cancel'),
      onPress: handleCancel,
      variant: ButtonVariants.Secondary,
      size: ButtonSize.Lg,
      testID: testID ? `${testID}-cancel` : undefined,
    },
    {
      label: strings('perps.provider_selector.warning.switch'),
      onPress: handleConfirm,
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      testID: testID ? `${testID}-confirm` : undefined,
    },
  ];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      testID={testID}
    >
      <View style={styles.warningContainer}>
        <Icon
          name={IconName.Warning}
          size={IconSize.Xl}
          color={IconColor.Warning}
          style={styles.warningIcon}
        />
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.warningTitle}
        >
          {strings('perps.provider_selector.warning.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.warningMessage}
        >
          {strings('perps.provider_selector.warning.message', {
            count: openPositionsCount,
            fromProvider,
            toProvider,
          })}
        </Text>
      </View>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={footerButtons}
      />
    </BottomSheet>
  );
};

export default PerpsProviderSwitchWarning;
