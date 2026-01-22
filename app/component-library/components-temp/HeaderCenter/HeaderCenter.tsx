// Third party dependencies.
import React, { useMemo } from 'react';

// External dependencies.
import {
  Box,
  BoxAlignItems,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  IconName,
  ButtonIconProps,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderBase from '../../components/HeaderBase';
import { HeaderCenterProps } from './HeaderCenter.types';

/**
 * HeaderCenter is a header component with centered title and optional back/close buttons.
 * Extends HeaderBase with convenient props for common header patterns.
 *
 * @example
 * ```tsx
 * <HeaderCenter
 *   title="Page Title"
 *   onBack={handleBack}
 *   onClose={handleClose}
 * />
 *
 * // Or with custom button props
 * <HeaderCenter
 *   title="Page Title"
 *   backButtonProps={{ onPress: handleBack, isDisabled: true }}
 *   closeButtonProps={{ onPress: handleClose }}
 * />
 * ```
 */
const HeaderCenter: React.FC<HeaderCenterProps> = ({
  title,
  titleProps,
  subtitle,
  subtitleProps,
  children,
  onBack,
  backButtonProps,
  onClose,
  closeButtonProps,
  endButtonIconProps,
  startButtonIconProps,
  twClassName,
  testID,
  ...headerBaseProps
}) => {
  // Build the startButtonIconProps with back button if needed
  const resolvedStartButtonIconProps = useMemo(() => {
    if (startButtonIconProps) {
      return startButtonIconProps;
    }
    if (onBack || backButtonProps) {
      return {
        iconName: IconName.ArrowLeft,
        ...(backButtonProps || {}),
        onPress: backButtonProps?.onPress ?? onBack,
      } as ButtonIconProps;
    }
    return undefined;
  }, [onBack, backButtonProps, startButtonIconProps]);

  // Build the endButtonIconProps array with close button if needed
  const resolvedEndButtonIconProps = useMemo(() => {
    const props: ButtonIconProps[] = [];

    // Add close button if onClose or closeButtonProps is provided
    if (onClose || closeButtonProps) {
      const closeProps: ButtonIconProps = {
        iconName: IconName.Close,
        ...(closeButtonProps || {}),
        onPress: closeButtonProps?.onPress ?? onClose,
      };
      props.push(closeProps);
    }

    // Add existing endButtonIconProps last
    if (endButtonIconProps) {
      props.push(...endButtonIconProps);
    }
    return props.length > 0 ? props : undefined;
  }, [endButtonIconProps, onClose, closeButtonProps]);

  // Render title if children is not provided
  const renderContent = () => {
    if (children) {
      return children;
    }
    if (title) {
      return (
        <Box alignItems={BoxAlignItems.Center}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            {...titleProps}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              {...subtitleProps}
              twClassName={`-mt-0.5 ${subtitleProps?.twClassName ?? ''}`.trim()}
            >
              {subtitle}
            </Text>
          )}
        </Box>
      );
    }
    return null;
  };

  const resolvedTwClassName = twClassName ? `px-2 ${twClassName}` : 'px-2';

  return (
    <HeaderBase
      testID={testID}
      startButtonIconProps={resolvedStartButtonIconProps}
      endButtonIconProps={resolvedEndButtonIconProps}
      twClassName={resolvedTwClassName}
      {...headerBaseProps}
    >
      {renderContent()}
    </HeaderBase>
  );
};

export default HeaderCenter;
