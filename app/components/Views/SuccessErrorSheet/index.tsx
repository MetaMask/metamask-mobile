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

export interface SuccessErrorSheetParams {
  onClose?: () => void;
  onButtonPress?: () => void;
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  buttonLabel: string | React.ReactNode;
  type: 'success' | 'error';
  icon: IconName;
}

export interface SuccessErrorSheetProps {
  route: { params: SuccessErrorSheetParams };
}

const SuccessErrorSheet = ({ route }: SuccessErrorSheetProps) => {
  const {
    onClose,
    onButtonPress,
    title,
    description,
    buttonLabel,
    type = 'success',
    icon,
  } = route.params;

  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleCtaActions = () => {
    if (onButtonPress) {
      onButtonPress();
      type === 'error' && sheetRef.current?.onCloseBottomSheet();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      sheetRef.current?.onCloseBottomSheet();
    }
  };

  const getIcon = () => {
    if (icon) {
      return icon;
    }
    return type === 'success' ? IconName.SuccessSolid : IconName.CircleX;
  };

  return (
    <BottomSheet ref={sheetRef} onClose={handleClose}>
      <View style={styles.statusContainer}>
        <Icon
          name={getIcon()}
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
            style={styles.description}
          >
            {description}
          </Text>
        ) : (
          description
        )}
        {typeof buttonLabel === 'string' ? (
          <Button
            variant={ButtonVariants.Primary}
            label={buttonLabel}
            width={ButtonWidthTypes.Full}
            style={styles.statusButton}
            onPress={handleCtaActions}
            size={ButtonSize.Lg}
          />
        ) : (
          buttonLabel
        )}
      </View>
    </BottomSheet>
  );
};

export default SuccessErrorSheet;
