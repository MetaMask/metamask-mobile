import React, { FunctionComponent } from 'react';
import { ButtonType, UserInputEventType } from '@metamask/snaps-sdk';
import ButtonLink from '../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { ButtonLinkProps } from '../../../component-library/components/Buttons/Button/variants/ButtonLink/ButtonLink.types';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

export interface SnapUIButtonProps {
  name?: string;
  loading?: boolean;
  type?: ButtonType;
  form?: string;
  variant: keyof typeof COLORS;
  textVariant?: TextVariant;
}

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
  textVariant,
  ...props
}) => {
  const { handleEvent } = useSnapInterfaceContext();

  const handlePress = () => {
    handleEvent({
      event: UserInputEventType.ButtonClickEvent,
      name,
    });

    // Since we don't have onSubmit on mobile, the button submits the form.
    if (type === ButtonType.Submit) {
      handleEvent({
        event: UserInputEventType.FormSubmitEvent,
        name: form,
      });
    }
  };

  const overriddenVariant = disabled ? 'disabled' : variant;

  const color = COLORS[overriddenVariant as keyof typeof COLORS];

  return (
    <ButtonLink
      {...props}
      id={name}
      onPress={handlePress}
      disabled={disabled}
      label={
        loading ? (
          <Icon
            // TODO: Animate this icon.
            name={IconName.Loading}
          />
        ) : (
          <Text color={color} variant={textVariant}>
            {children}
          </Text>
        )
      }
    />
  );
};
