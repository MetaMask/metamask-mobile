import React, { useLayoutEffect } from 'react';
import { View } from 'react-native';
import Text from '../../../component-library/components/Texts/Text';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text/Text.types';
import { useNavigation } from '@react-navigation/native';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
import { useTheme } from '../../../util/theme';
import styles from './index.styles';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';

export interface ErrorSheetProps {
  onClose: () => void;
  onNext: () => void;
  errorTitle: string | React.ReactNode;
  errorDescription: string | React.ReactNode;
  buttonLabel: string | React.ReactNode;
  open: boolean;
}

const ErrorSheet = ({
  open = false,
  onClose,
  onNext,
  errorTitle,
  errorDescription,
  buttonLabel = strings('error_sheet.error_button'),
}: ErrorSheetProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions(getTransparentOnboardingNavbarOptions(colors));
  }, [navigation, colors]);

  return open ? (
    <BottomSheet onClose={onClose} shouldNavigateBack={false}>
      <View style={styles.statusContainer}>
        <Icon
          name={IconName.CircleX}
          size={IconSize.Xl}
          color={colors.error.default}
        />
        {typeof errorTitle === 'string' ? (
          <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
            {errorTitle}
          </Text>
        ) : (
          errorTitle
        )}
        {typeof errorDescription === 'string' ? (
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            style={styles.errorDescription}
          >
            {errorDescription}
          </Text>
        ) : (
          errorDescription
        )}
        {typeof buttonLabel === 'string' ? (
          <Button
            variant={ButtonVariants.Primary}
            label={buttonLabel}
            width={ButtonWidthTypes.Full}
            style={styles.statusButton}
            onPress={onNext}
            size={ButtonSize.Lg}
          />
        ) : (
          buttonLabel
        )}
      </View>
    </BottomSheet>
  ) : null;
};

export default ErrorSheet;
