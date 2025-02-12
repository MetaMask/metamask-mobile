import React, { FunctionComponent } from 'react';
import { ButtonType, SnapId, UserInputEventType } from '@metamask/snaps-sdk';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import { IconSize } from '../../../component-library/components/Icons/Icon';
import {
  ButtonProps,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button/Button.types';
import { ActivityIndicator, View } from 'react-native';
import { DEFAULT_BUTTONSECONDARY_LABEL_TEXTVARIANT } from '../../../component-library/components/Buttons/Button/variants/ButtonSecondary/ButtonSecondary.constants';
import { SnapIcon } from '../SnapIcon/SnapIcon';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useSelector } from 'react-redux';
import { selectSnaps } from '../../../selectors/snaps/snapController';
import SnapUIButton from '../SnapUIButton/SnapUIButton';
import {
  DEFAULT_BUTTONPRIMARY_LABEL_COLOR,
  DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT,
} from '../../../component-library/components/Buttons/Button/variants/ButtonPrimary/ButtonPrimary.constants';

interface SnapUIFooterButtonProps {
  name?: string;
  variant?: ButtonVariants;
  isSnapAction?: boolean;
  onCancel?: () => void;
  label: string;
  type: ButtonType;
  snapVariant: ButtonVariants;
}

export const SnapUIFooterButton: FunctionComponent<
  SnapUIFooterButtonProps & ButtonProps
> = ({
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

  const hideSnapBranding = snapMetadata.hideSnapBranding;

  const handleSnapAction = () => {
    handleEvent({
      event: UserInputEventType.ButtonClickEvent,
      name,
    });
  };

  const handlePress = () => {
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

  const renderLabel = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={DEFAULT_BUTTONSECONDARY_LABEL_TEXTVARIANT}
        />
      );
    }
    if (isSnapAction && !hideSnapBranding && !loading) {
      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <SnapIcon snapId={snapId} avatarSize={IconSize.Sm} />
          <Text
            variant={DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT}
            color={DEFAULT_BUTTONPRIMARY_LABEL_COLOR}
          >
            {label}
          </Text>
        </View>
      );
    }

    if (!loading) {
      return label;
    }

    if (!label) {
      return children;
    }
  };

  return (
    <SnapUIButton
      label={renderLabel()}
      type={type}
      handlePress={handlePress}
      snapVariant={snapVariant}
      name={name ?? ''}
      disabled={disabled}
      loading={loading}
      variant={buttonVariant}
      textVariant={TextVariant.BodyMD}
      children={children}
      {...props}
    />
  );
};
