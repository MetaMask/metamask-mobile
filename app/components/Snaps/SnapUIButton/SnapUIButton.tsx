import { ActivityIndicator } from 'react-native';
import { ButtonType, UserInputEventType } from '@metamask/snaps-sdk';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button/Button.types';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text/Text.types';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import Button from '../../../component-library/components/Buttons/Button';
import Text from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from '../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.styles';
import {
  DEFAULT_BUTTONPRIMARY_LABEL_COLOR,
  DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT,
} from '../../../component-library/components/Buttons/Button/variants/ButtonPrimary/ButtonPrimary.constants';
import { DEFAULT_BOTTOMSHEETFOOTER_BUTTONSALIGNMENT } from '../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.constants';

interface SnapUIButtonProps {
  label: string | React.ReactNode;
  type: ButtonType;
  snapVariant: ButtonVariants;
  name: string;
  children: React.ReactNode;
  disabled: boolean;
  loading: boolean;
  textVariant: TextVariant;
  variant: ButtonVariants;
  handlePress: () => void;
}

const COLORS = {
  primary: TextColor.Info,
  destructive: TextColor.Error,
  disabled: TextColor.Muted,
};

const SnapUIButton = ({
  label,
  name,
  children,
  type = ButtonType.Button,
  variant = ButtonVariants.Primary,
  disabled = false,
  loading = false,
  textVariant = TextVariant.BodyMD,
  handlePress,
  ...props
}: SnapUIButtonProps) => {
  // const { handleEvent } = useSnapInterfaceContext();
  const { styles } = useStyles(styleSheet, {
    buttonsAlignment: DEFAULT_BOTTOMSHEETFOOTER_BUTTONSALIGNMENT,
  });

  // const handlePress = () => {
  //   handleEvent({
  //     event: UserInputEventType.ButtonClickEvent,
  //     name,
  //   });
  // };

  const overriddenVariant = disabled ? 'disabled' : variant;
  const color = COLORS[overriddenVariant as keyof typeof COLORS];

  const buttonLabel = loading ? (
    <ActivityIndicator size="small" color={DEFAULT_BUTTONPRIMARY_LABEL_COLOR} />
  ) : (
    <Text
      variant={textVariant || DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT}
      color={color}
    >
      {label}
    </Text>
  );

  return (
    <Button
      variant={variant}
      onPress={handlePress}
      disabled={disabled}
      loading={loading}
      label={buttonLabel}
      size={ButtonSize.Lg}
      style={styles.button}
      {...props}
    />
  );
};

export default SnapUIButton;
