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
import Text from '../../../component-library/components/Texts/Text';
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
import { ButtonProps } from '@metamask/snaps-sdk/jsx';
import { useTheme } from '../../../util/theme';

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
  type: ButtonType;
  snapVariant: ButtonProps['variant'];
  disabled?: boolean;
  loading?: boolean;
}

export const SnapUIFooterButton: FunctionComponent<SnapUIFooterButtonProps> = ({
  onCancel,
  name,
  children,
  disabled = false,
  loading = false,
  isSnapAction = false,
  variant = ButtonVariants.Primary,
  snapVariant,
  ...props
}) => {
  const theme = useTheme();
  const { handleEvent, snapId } = useSnapInterfaceContext();
  const snaps = useSelector(selectSnaps);
  const snapMetadata = snaps[snapId as SnapId];
  const hideSnapBranding = snapMetadata.hideSnapBranding;

  const { styles } = useStyles(styleSheet, {
    buttonsAlignment: DEFAULT_BOTTOMSHEETFOOTER_BUTTONSALIGNMENT,
  });

  // Override and use custom styles for Snap action buttons
  const customButtonStyles = {
    ...styles,
    button: {
      ...styles.button,
      ...(isSnapAction && !hideSnapBranding && snapVariant !== 'destructive'
        ? { backgroundColor: theme.colors.icon.default }
        : {}),
    },
  };

  const handleSnapAction = () => {
    handleEvent({
      event: UserInputEventType.ButtonClickEvent,
      name,
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const handlePress = isSnapAction ? handleSnapAction : onCancel!;

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
    } else if (isSnapAction && !hideSnapBranding) {
      return (
        <View style={localStyles.snapActionContainer}>
          <SnapIcon snapId={snapId} avatarSize={IconSize.Sm} />
          <Text
            variant={DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT}
            color={DEFAULT_BUTTONPRIMARY_LABEL_COLOR}
          >
            {children}
          </Text>
        </View>
      );
    }
    return (
      <Text
        variant={DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT}
        color={
          variant === ButtonVariants.Primary
            ? DEFAULT_BUTTONPRIMARY_LABEL_COLOR
            : theme.colors.primary.default
        }
      >
        {children}
      </Text>
    );
  };

  return (
    <Button
      {...props}
      variant={buttonVariant}
      onPress={handlePress}
      isDisabled={disabled}
      label={buttonLabel()}
      size={ButtonSize.Lg}
      style={customButtonStyles.button}
      isDanger={snapVariant === 'destructive'}
    />
  );
};
