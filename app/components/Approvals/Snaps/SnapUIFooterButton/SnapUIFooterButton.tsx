import React, { FunctionComponent } from 'react';
import { UserInputEventType } from '@metamask/snaps-sdk';
import { useSnapInterfaceContext } from '../SnapUIRenderer/SnapInterfaceContext';
import { AlignItems, FlexDirection } from '../SnapUIRenderer/utils';
import Button, {
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import { IconSize } from '../../../../component-library/components/Icons/Icon';
import {
  ButtonProps,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button/Button.types';
import { ActivityIndicator } from 'react-native';
import { DEFAULT_BUTTONSECONDARY_LABEL_TEXTVARIANT } from '../../../../component-library/components/Buttons/Button/variants/ButtonSecondary/ButtonSecondary.constants';
import { SnapIcon } from '../SnapIcon/SnapIcon';

type SnapUIFooterButtonProps = {
  name?: string;
  variant?: ButtonVariants;
  isSnapAction?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
};

export const SnapUIFooterButton: FunctionComponent<
  SnapUIFooterButtonProps & ButtonProps
> = ({
  onCancel,
  onConfirm,
  name,
  children,
  disabled = false,
  loading = false,
  isSnapAction = false,
  type,
  label,
  variant = ButtonVariants.Primary,
}) => {
  const { handleEvent, snapId } = useSnapInterfaceContext();
  // TODO: Not sure where this is coming from on mobile
  const hideSnapBranding = true;

  const handleSnapAction = () => {
    handleEvent({
      event: UserInputEventType.ButtonClickEvent,
      name,
    });
    if (name === 'cancel' && onCancel) {
      onCancel();
    }
    if (name === 'confirm' && onConfirm) {
      onConfirm();
    }
  };

  const handleClick = () => {
    if (isSnapAction) {
      handleSnapAction();
    } else if (onCancel) {
      onCancel();
    }
  };

  const brandedButtonVariant = isSnapAction
    ? ButtonVariants.Primary
    : ButtonVariants.Secondary;

  const buttonVariant = hideSnapBranding ? variant : brandedButtonVariant;

  return (
    <Button
      type={type}
      label={label}
      size={ButtonSize.Lg}
      disabled={disabled}
      variant={buttonVariant}
      onPress={handleClick}
      textProps={{
        alignItems: AlignItems.center,
        flexDirection: FlexDirection.Row,
      }}
      data-theme={null}
      style={{
        flex: 1,
        marginHorizontal: 4,
      }}
    >
      {isSnapAction && !hideSnapBranding && !loading && (
        <SnapIcon snapId={snapId} avatarSize={IconSize.Sm} />
      )}
      {loading ? (
        <ActivityIndicator
          size="small"
          color={DEFAULT_BUTTONSECONDARY_LABEL_TEXTVARIANT}
        />
      ) : (
        children
      )}
    </Button>
  );
};
