import React, { FunctionComponent, MouseEvent as ReactMouseEvent } from 'react';
import { ButtonType, UserInputEventType } from '@metamask/snaps-sdk';
import ButtonLink from '../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { ButtonLinkProps } from '../../../component-library/components/Buttons/Button/variants/ButtonLink/ButtonLink.types';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import Icon, { IconName } from '../../../component-library/components/Icons/Icon';
import { TextColor } from '../../../component-library/components/Texts/Text';

export type SnapUIButtonProps = {
  name?: string;
  loading?: boolean;
  type?: ButtonType;
  form?: string;
  variant: keyof typeof COLORS;
};

const COLORS = {
  primary: TextColor.Info,
  destructive: TextColor.Error,
  disabled: TextColor.Muted,
};

export const SnapUIButton: FunctionComponent<
  SnapUIButtonProps & ButtonLinkProps
> = ({
  name,
  children,
  form,
  type = ButtonType.Button,
  variant = 'primary',
  disabled = false,
  loading = false,
  ...props
}) => {
  const { handleEvent } = useSnapInterfaceContext();

  const handlePress = () => {
    handleEvent({
      event: UserInputEventType.ButtonClickEvent,
      name,
    });

    // TODO: Verify ordering here
    if (type === ButtonType.Submit) {
        handleEvent({
            event: UserInputEventType.FormSubmitEvent,
            name: form,
          });
    }
  };

  const overriddenVariant = disabled ? 'disabled' : variant;

  const color = COLORS[overriddenVariant as keyof typeof COLORS];

  // TODO: Support sizing the text
  return (
    <ButtonLink
      {...props}
      id={name}
      onPress={handlePress}
      color={color}
      disabled={disabled}
      label={loading ? (
        <Icon
          name={IconName.Loading}
          // style={{ animation: 'spin 1.2s linear infinite' }}
        />
      ) : (
        children
      )}
    />
  );
};
