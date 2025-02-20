import React, { FunctionComponent } from 'react';
import { ButtonType, SnapId, UserInputEventType } from '@metamask/snaps-sdk';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import { IconSize } from '../../../component-library/components/Icons/Icon';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button/Button.types';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SnapIcon } from '../SnapIcon/SnapIcon';
import Text, {
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { useSelector } from 'react-redux';
import { selectSnaps } from '../../../selectors/snaps/snapController';
import {
  DEFAULT_BUTTONPRIMARY_LABEL_COLOR,
  DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT,
} from '../../../component-library/components/Buttons/Button/variants/ButtonPrimary/ButtonPrimary.constants';
import {
  FlexDirection,
  JustifyContent,
  AlignItems,
} from '../../UI/Box/box.types';
import { DEFAULT_BOTTOMSHEETFOOTER_BUTTONSALIGNMENT } from '../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.constants';
import Button from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from '../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.styles';

const localStyles = StyleSheet.create({
  snapActionContainer: {
    flexDirection: FlexDirection.Row,
    alignItems: AlignItems.center,
    justifyContent: JustifyContent.center,
    gap: 4,
  },
});

interface SnapUIFooterButtonProps {
  name?: string;
  variant?: ButtonVariants;
  isSnapAction?: boolean;
  onCancel?: () => void;
  label: string;
  type: ButtonType;
  snapVariant: ButtonVariants;
  disabled?: boolean;
  loading?: boolean;
}

const COLORS = {
  primary: TextColor.Info,
  destructive: TextColor.Error,
  disabled: TextColor.Muted,
};

export const SnapUIFooterButton: FunctionComponent<SnapUIFooterButtonProps> = ({
  onCancel,
  name,
  children,
  disabled = false,
  loading = false,
  isSnapAction = false,
  type,
  variant = ButtonVariants.Primary,
  snapVariant,
  label,
  ...props
}) => {
  const { handleEvent, snapId } = useSnapInterfaceContext();
  const snaps = useSelector(selectSnaps);
  const snapMetadata = snaps[snapId as SnapId];

  const { styles } = useStyles(styleSheet, {
    buttonsAlignment: DEFAULT_BOTTOMSHEETFOOTER_BUTTONSALIGNMENT,
  });

  const handlePress = () => {
    handleEvent({
      event: UserInputEventType.ButtonClickEvent,
      name,
    });
  };

  const overriddenVariant = disabled ? 'disabled' : variant;
  const color = COLORS[overriddenVariant as keyof typeof COLORS];

  const hideSnapBranding = snapMetadata.hideSnapBranding;

  const brandedButtonVariant = isSnapAction
    ? ButtonVariants.Primary
    : ButtonVariants.Secondary;

  const buttonVariant = hideSnapBranding ? variant : brandedButtonVariant;

  const buttonLabel = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={DEFAULT_BUTTONPRIMARY_LABEL_COLOR}
        />
      );
    } else if (isSnapAction && !hideSnapBranding && !loading) {
      return (
        <View style={localStyles.snapActionContainer}>
          <SnapIcon snapId={snapId} avatarSize={IconSize.Sm} />
          <Text
            variant={DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT}
            color={DEFAULT_BUTTONPRIMARY_LABEL_COLOR}
          >
            {label}
          </Text>
        </View>
      );
    } else {
      return (
        <Text variant={DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT} color={color}>
          {label}
        </Text>
      );
    }
  };

  return (
    <Button
      variant={buttonVariant}
      onPress={handlePress}
      disabled={disabled}
      loading={loading}
      label={buttonLabel()}
      size={ButtonSize.Lg}
      style={styles.button}
      {...props}
    />
  );
};
