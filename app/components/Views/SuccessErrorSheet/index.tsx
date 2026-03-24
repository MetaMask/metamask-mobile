import React, { useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { SuccessErrorSheetParams } from './interface';

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
    isInteractable = true,
    closeOnPrimaryButtonPress = false,
    closeOnSecondaryButtonPress = true,
    reverseButtonOrder = false,
    descriptionAlign = 'left',
    iconColor,
  } = route.params;

  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleSecondaryButtonPress = () => {
    closeOnSecondaryButtonPress && navigation.goBack();
    if (onSecondaryButtonPress) {
      onSecondaryButtonPress();
    }
  };

  const handlePrimaryButtonPress = () => {
    closeOnPrimaryButtonPress && navigation.goBack();
    if (onPrimaryButtonPress) {
      onPrimaryButtonPress();
    }
  };

  const getIcon =
    icon || (type === 'success' ? IconName.Confirmation : IconName.CircleX);

  const getIconColor =
    iconColor ||
    (type === 'success' ? colors.success.default : colors.error.default);

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={handleClose}
      isInteractable={isInteractable}
    >
      <View style={styles.statusContainer}>
        <Icon name={getIcon} size={IconSize.Xl} color={getIconColor} />

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
