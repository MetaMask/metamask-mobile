import React, { FunctionComponent } from 'react';
import { ButtonType, UserInputEventType } from '@metamask/snaps-sdk';
import { TouchableOpacity } from 'react-native';
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
  disabled?: boolean;
  loading?: boolean;
  type?: ButtonType;
  form?: string;
}

export const SnapUIButton: FunctionComponent<SnapUIButtonProps> = ({
  name,
  children,
  form,
  type = ButtonType.Button,
  disabled = false,
  loading = false,
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

  return (
    <TouchableOpacity id={name} onPress={handlePress} disabled={disabled}>
      {loading ? (
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
        children
      )}
    </TouchableOpacity>
  );
};
