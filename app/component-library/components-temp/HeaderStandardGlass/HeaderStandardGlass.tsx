import React, { useMemo } from 'react';
import {
  Box,
  BoxFlexDirection,
  HeaderStandard,
  IconName,
  type HeaderStandardProps,
} from '@metamask/design-system-react-native';

import ButtonIconGlass, { type ButtonIconGlassProps } from '../ButtonIconGlass';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';

export type HeaderStandardGlassProps = Omit<
  HeaderStandardProps,
  | 'backButtonProps'
  | 'closeButtonProps'
  | 'startButtonIconProps'
  | 'endButtonIconProps'
> & {
  /**
   * Seats the icon buttons in glass capsules.
   * Defaults to whether the OS can draw Liquid Glass.
   */
  isGlass?: boolean;
  /**
   * Props for the back button. Includes `ButtonIconGlass` capsule props.
   * Renders a back button when provided, together with `onBack`.
   */
  backButtonProps?: Omit<ButtonIconGlassProps, 'iconName'>;
  /**
   * Props for the close button. Includes `ButtonIconGlass` capsule props.
   * Renders a close button when provided, together with `onClose`.
   */
  closeButtonProps?: Omit<ButtonIconGlassProps, 'iconName'>;
  /**
   * Props for a custom start `ButtonIconGlass`.
   * Takes priority over `onBack` and `backButtonProps`.
   */
  startButtonIconProps?: ButtonIconGlassProps;
  /**
   * Props for end `ButtonIconGlass` buttons.
   * The close button is prepended when `onClose` or `closeButtonProps` is set.
   * The first item renders rightmost, matching `HeaderStandard`.
   */
  endButtonIconProps?: ButtonIconGlassProps[];
};

/**
 * The design-system `HeaderStandard`, with every icon button rendered as
 * `ButtonIconGlass`. Capsules follow `isGlass`, or Liquid Glass availability.
 */
const HeaderStandardGlass = ({
  isGlass,
  onBack,
  backButtonProps,
  onClose,
  closeButtonProps,
  endButtonIconProps,
  startButtonIconProps,
  startAccessory,
  endAccessory,
  ...props
}: HeaderStandardGlassProps) => {
  const { isGlassEnabled } = useLiquidGlass();
  const isCapsule = isGlass ?? isGlassEnabled;

  const resolvedStartButtonIconProps = useMemo(() => {
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
  }, [onBack, backButtonProps, startButtonIconProps]);

  const resolvedEndButtonIconProps = useMemo(() => {
    const buttonProps: ButtonIconGlassProps[] = [];

    if (onClose || closeButtonProps) {
      buttonProps.push({
        iconName: IconName.Close,
        ...closeButtonProps,
        onPress: closeButtonProps?.onPress ?? onClose,
      });
    }

    if (endButtonIconProps) {
      buttonProps.push(...endButtonIconProps);
    }

    return buttonProps.length > 0 ? buttonProps : undefined;
  }, [endButtonIconProps, onClose, closeButtonProps]);

  const renderButtonIcon = (iconProps: ButtonIconGlassProps, key?: string) => (
    <ButtonIconGlass
      key={key}
      {...iconProps}
      isCapsule={iconProps.isCapsule ?? isCapsule}
    />
  );

  const renderEndAccessory = () => {
    if (endAccessory) {
      return endAccessory;
    }
    if (!resolvedEndButtonIconProps) {
      return undefined;
    }

    const buttons = resolvedEndButtonIconProps
      .map((iconProps, originalIndex) => ({ iconProps, originalIndex }))
      .reverse()
      .map(({ iconProps, originalIndex }) =>
        renderButtonIcon(iconProps, `end-button-icon-${originalIndex}`),
      );

    if (buttons.length === 1) {
      return buttons[0];
    }

    return (
      <Box flexDirection={BoxFlexDirection.Row} gap={2}>
        {buttons}
      </Box>
    );
  };

  return (
    <HeaderStandard
      {...props}
      startAccessory={
        startAccessory ??
        (resolvedStartButtonIconProps
          ? renderButtonIcon(resolvedStartButtonIconProps)
          : undefined)
      }
      endAccessory={renderEndAccessory()}
    />
  );
};

HeaderStandardGlass.displayName = 'HeaderStandardGlass';

export default HeaderStandardGlass;
