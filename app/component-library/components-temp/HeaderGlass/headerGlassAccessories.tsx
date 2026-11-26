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

/** The start button as MMDS resolves it: a custom icon, else back. */
export const resolveStartButtonIconProps = ({
  startButtonIconProps,
  onBack,
  backButtonProps,
}: HeaderGlassStartInputs): ButtonIconProps | undefined => {
  if (startButtonIconProps) {
    return startButtonIconProps;
  }
  if (onBack || backButtonProps) {
    return {
      iconName: IconName.ArrowLeft,
      ...backButtonProps,
      onPress: backButtonProps?.onPress ?? onBack,
    };
  }
  return undefined;
};

/** The start slot as MMDS resolves it, with built-in icons in glass capsules. */
export const resolveStartAccessoryGlass = (
  inputs: HeaderGlassStartInputs,
): ReactNode => {
  if (inputs.startAccessory) {
    return inputs.startAccessory;
  }
  const props = resolveStartButtonIconProps(inputs);
  return props ? renderCapsule(props) : undefined;
};

/** The end buttons as MMDS resolves them: close first, then the icons. */
export const resolveEndButtonIconProps = ({
  endButtonIconProps = [],
  onClose,
  closeButtonProps,
}: HeaderGlassEndInputs): ButtonIconProps[] =>
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

/** The end slot as MMDS resolves it, with built-in icons in glass capsules. */
export const resolveEndAccessoryGlass = (
  inputs: HeaderGlassEndInputs,
): ReactNode => {
  if (inputs.endAccessory) {
    return inputs.endAccessory;
  }
  const icons = resolveEndButtonIconProps(inputs);
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
