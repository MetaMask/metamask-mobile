import React, { type ReactNode } from 'react';
import {
  Box,
  BoxFlexDirection,
  ButtonIconSize,
  IconName,
  type ButtonIconProps,
} from '@metamask/design-system-react-native';

import ButtonIconGlass from '../ButtonIconGlass';

type HeaderButtonIconProps = Omit<ButtonIconProps, 'iconName'>;

export interface HeaderGlassStartInputs {
  startAccessory?: ReactNode;
  startButtonIconProps?: ButtonIconProps;
  onBack?: () => void;
  backButtonProps?: HeaderButtonIconProps;
}

export interface HeaderGlassEndInputs {
  endAccessory?: ReactNode;
  endButtonIconProps?: ButtonIconProps[];
  onClose?: () => void;
  closeButtonProps?: HeaderButtonIconProps;
}

const renderCapsule = (props: ButtonIconProps, key?: string) => (
  <ButtonIconGlass key={key} isCapsule size={ButtonIconSize.Md} {...props} />
);

/** The start slot as MMDS resolves it, with built-in icons in glass capsules. */
export const resolveStartAccessoryGlass = ({
  startAccessory,
  startButtonIconProps,
  onBack,
  backButtonProps,
}: HeaderGlassStartInputs): ReactNode => {
  if (startAccessory) {
    return startAccessory;
  }
  if (startButtonIconProps) {
    return renderCapsule(startButtonIconProps);
  }
  if (onBack || backButtonProps) {
    return renderCapsule({
      iconName: IconName.ArrowLeft,
      ...backButtonProps,
      onPress: backButtonProps?.onPress ?? onBack,
    });
  }
  return undefined;
};

/** The end slot as MMDS resolves it, with built-in icons in glass capsules. */
export const resolveEndAccessoryGlass = ({
  endAccessory,
  endButtonIconProps = [],
  onClose,
  closeButtonProps,
}: HeaderGlassEndInputs): ReactNode => {
  if (endAccessory) {
    return endAccessory;
  }
  const icons: ButtonIconProps[] =
    onClose || closeButtonProps
      ? [
          {
            iconName: IconName.Close,
            ...closeButtonProps,
            onPress: closeButtonProps?.onPress ?? onClose,
          },
          ...endButtonIconProps,
        ]
      : endButtonIconProps;
  if (icons.length === 0) {
    return undefined;
  }
  // As in MMDS, the first icon sits rightmost.
  const capsules = icons
    .map((props, index) => renderCapsule(props, `end-button-icon-${index}`))
    .reverse();
  return icons.length > 1 ? (
    <Box flexDirection={BoxFlexDirection.Row} gap={2}>
      {capsules}
    </Box>
  ) : (
    capsules[0]
  );
};
