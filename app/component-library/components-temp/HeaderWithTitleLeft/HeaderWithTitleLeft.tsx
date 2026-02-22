// Third party dependencies.
import React, { useMemo } from 'react';

// External dependencies.
import {
  Box,
  IconName,
  ButtonIconProps,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderBase from '../../components/HeaderBase';
import TitleLeft from '../TitleLeft';
import { HeaderWithTitleLeftProps } from './HeaderWithTitleLeft.types';

/**
 * HeaderWithTitleLeft is a header component that combines HeaderBase (with back button)
 * on top and a TitleLeft section below it.
 *
 * @example
 * ```tsx
 * <HeaderWithTitleLeft
 *   onBack={handleBack}
 *   titleLeftProps={{
 *     topLabel: "Send",
 *     title: "$4.42",
 *     endAccessory: <NFTImage />
 *   }}
 * />
 * ```
 */
const HeaderWithTitleLeft: React.FC<HeaderWithTitleLeftProps> = ({
  onBack,
  backButtonProps,
  onClose,
  closeButtonProps,
  titleLeft,
  titleLeftProps,
  startButtonIconProps,
  endButtonIconProps,
  twClassName,
  testID,
  titleSectionTestID,
  ...headerBaseProps
}) => {
  // Build startButtonIconProps with back button if onBack or backButtonProps is provided
  const resolvedStartButtonIconProps = useMemo(() => {
    if (startButtonIconProps) {
      // If startButtonIconProps is explicitly provided, use it as-is
      return startButtonIconProps;
    }

    if (onBack || backButtonProps) {
      const backProps: ButtonIconProps = {
        iconName: IconName.ArrowLeft,
        ...(backButtonProps || {}),
        onPress: backButtonProps?.onPress ?? onBack,
      };
      return backProps;
    }

    return undefined;
  }, [startButtonIconProps, onBack, backButtonProps]);

  // Build endButtonIconProps with close button if onClose or closeButtonProps is provided
  const resolvedEndButtonIconProps = useMemo(() => {
    const props: ButtonIconProps[] = [];

    if (onClose || closeButtonProps) {
      const closeProps: ButtonIconProps = {
        iconName: IconName.Close,
        ...(closeButtonProps || {}),
        onPress: closeButtonProps?.onPress ?? onClose,
      };
      props.push(closeProps);
    }

    if (endButtonIconProps) {
      props.push(...endButtonIconProps);
    }

    return props.length > 0 ? props : undefined;
  }, [endButtonIconProps, onClose, closeButtonProps]);

  // Render title section content
  const renderTitleSection = () => {
    if (titleLeft) {
      return titleLeft;
    }
    if (titleLeftProps) {
      return <TitleLeft {...titleLeftProps} />;
    }
    return null;
  };

  const hasTitleSection = titleLeft || titleLeftProps;

  const resolvedTwClassName = twClassName ? `px-2 ${twClassName}` : 'px-2';

  return (
    <Box testID={testID}>
      {/* HeaderBase section */}
      <HeaderBase
        startButtonIconProps={resolvedStartButtonIconProps}
        endButtonIconProps={resolvedEndButtonIconProps}
        twClassName={resolvedTwClassName}
        {...headerBaseProps}
      />

      {/* TitleLeft section */}
      {hasTitleSection && (
        <Box testID={titleSectionTestID}>{renderTitleSection()}</Box>
      )}
    </Box>
  );
};

export default HeaderWithTitleLeft;
