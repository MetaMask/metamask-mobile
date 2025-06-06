import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import Text from '../../../component-library/components/Texts/Text';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text/Text.types';
import { useTheme } from '../../../util/theme';
import styles from './index.styles';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

export interface SuccessErrorSheetParams {
  onClose?: () => void;
  onButtonPress?: () => void;
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  customButton: React.ReactNode;
  type: 'success' | 'error';
  icon: IconName;
  secondaryButtonLabel?: string;
  onSecondaryButtonPress?: () => void;
  primaryButtonLabel?: string;
  onPrimaryButtonPress?: () => void;
  closeOnPrimaryButtonPress?: boolean;
  closeOnSecondaryButtonPress?: boolean;
  reverseButtonOrder?: boolean;
  descriptionAlign?: 'center' | 'left';
}

export interface SuccessErrorSheetProps {
  route: { params: SuccessErrorSheetParams };
}

const SuccessErrorSheet = ({ route }: SuccessErrorSheetProps) => {
  const {
    onClose,
    title,
    description,
    customButton,
    type = 'success',
    icon,
    secondaryButtonLabel,
    onSecondaryButtonPress,
    primaryButtonLabel,
    onPrimaryButtonPress,
    closeOnPrimaryButtonPress = false,
    closeOnSecondaryButtonPress = true,
    reverseButtonOrder = false,
    descriptionAlign = 'left',
  } = route.params;

  const { colors } = useTheme();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const currentIcon = useMemo(() => {
    if (icon) {
      return icon;
    }
    return type === 'success' ? IconName.CheckBold : IconName.CircleX;
  }, [icon, type]);

  const handleSecondaryButtonPress = () => {
    if (onSecondaryButtonPress) {
      onSecondaryButtonPress();
    }
    if (closeOnSecondaryButtonPress) {
      bottomSheetRef.current?.onCloseBottomSheet();
    }
  };

  const handlePrimaryButtonPress = () => {
    if (onPrimaryButtonPress) {
      onPrimaryButtonPress();
    }
    if (closeOnPrimaryButtonPress) {
      bottomSheetRef.current?.onCloseBottomSheet();
    }
  };

  return (
    <BottomSheet ref={bottomSheetRef} onClose={handleClose}>
      <View style={styles.statusContainer}>
        <Icon
          name={currentIcon}
          size={IconSize.Xl}
          color={
            type === 'success' ? colors.success.default : colors.error.default
          }
        />

        {typeof title === 'string' ? (
          <Text
            variant={TextVariant.HeadingMD}
            color={TextColor.Default}
            style={styles.title}
          >
            {title}
          </Text>
        ) : (
          title
        )}

        {typeof description === 'string' ? (
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            style={
              descriptionAlign === 'center'
                ? styles.descriptionCenter
                : styles.descriptionLeft
            }
          >
            {description}
          </Text>
        ) : (
          description
        )}

        {secondaryButtonLabel || primaryButtonLabel ? (
          <View
            style={[
              styles.ctaContainer,
              reverseButtonOrder && styles.reverseCtaContainer,
            ]}
          >
            {secondaryButtonLabel && (
              <Button
                variant={ButtonVariants.Secondary}
                label={secondaryButtonLabel}
                width={ButtonWidthTypes.Full}
                style={
                  primaryButtonLabel && secondaryButtonLabel
                    ? styles.statusButton
                    : styles.fullWidthButton
                }
                onPress={handleSecondaryButtonPress}
                size={ButtonSize.Lg}
              />
            )}
            {primaryButtonLabel && (
              <Button
                variant={ButtonVariants.Primary}
                label={primaryButtonLabel}
                width={ButtonWidthTypes.Full}
                style={
                  primaryButtonLabel && secondaryButtonLabel
                    ? styles.statusButton
                    : styles.fullWidthButton
                }
                onPress={handlePrimaryButtonPress}
                size={ButtonSize.Lg}
              />
            )}
          </View>
        ) : (
          customButton
        )}
      </View>
    </BottomSheet>
  );
};

export default SuccessErrorSheet;
