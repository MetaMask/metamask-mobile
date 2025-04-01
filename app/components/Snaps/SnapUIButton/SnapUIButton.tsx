import React, { FunctionComponent } from 'react';
import { ButtonType, UserInputEventType } from '@metamask/snaps-sdk';
import ButtonLink from '../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { ButtonLinkProps } from '../../../component-library/components/Buttons/Button/variants/ButtonLink/ButtonLink.types';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import AnimatedLottieView from 'lottie-react-native';

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
          <AnimatedLottieView
            source={{ uri: './loading.json' }}
            autoPlay
            loop
            // eslint-disable-next-line react-native/no-inline-styles
            style={{
              width: 24,
              height: 24,
            }}
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
