import React from 'react';
import { View } from 'react-native';
import Checkbox from '../../../../component-library/components/Checkbox/Checkbox';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import createStyles from './styles';
import { useTheme } from '../../../../util/theme';
interface ModalContentProps {
  title: string;
  message: string;
  iconName: IconName;
  iconColor: IconColor;
  iconSize: IconSize;
  checkBoxLabel: string;
  btnLabelCancel: string;
  btnLabelCta: string;
  isChecked: boolean;
  setIsChecked: (isChecked: boolean) => void;
  hascheckBox?: boolean | null
  handleCta: () => void;
  handleCancel: () => void;
  loading?: boolean;
}

const ModalContent = ({ title, message, iconName, iconColor, iconSize, checkBoxLabel, btnLabelCancel, btnLabelCta, isChecked, setIsChecked, hascheckBox, handleCancel, handleCta, loading } :ModalContentProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
    <Icon
      name={iconName}
      color={iconColor}
      size={iconSize}
      style={styles.icon}
    />
    <Text variant={TextVariant.HeadingMD} style={styles.title}>
      {title}
    </Text>
    <Text variant={TextVariant.BodyMD} style={styles.description}>
      {message}
    </Text>
    <View style={styles.bottom}>
      {hascheckBox && (
        <Checkbox
          label={checkBoxLabel}
          isChecked={isChecked}
          onPress={() => setIsChecked(!isChecked)}
        />
      )}
      <View style={styles.buttonsContainer}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          style={styles.button}
          accessibilityRole={'button'}
          accessible
          label={btnLabelCancel}
          onPress={handleCancel}
        />
        <View style={styles.spacer} />
        <Button
          variant={ButtonVariants.Primary}
          isDisabled={hascheckBox ? !isChecked : false}
          isDanger={hascheckBox ?? false}
          size={ButtonSize.Lg}
          style={styles.button}
          accessibilityRole={'button'}
          accessible
          label={btnLabelCta}
          onPress={handleCta}
          loading={loading}
        />
      </View>
    </View>
  </View>
  );};


export default ModalContent;
