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
import TitleStandard from '../TitleStandard';
import { HeaderStackedStandardProps } from './HeaderStackedStandard.types';

/**
 * HeaderStackedStandard is a header component that combines HeaderBase (with back button)
 * on top and a TitleStandard section below it.
 *
 * @example
 * ```tsx
 * <HeaderStackedStandard
 *   onBack={handleBack}
 *   titleStandardProps={{
 *     topLabel: "Send",
 *     title: "$4.42",
 *   }}
 * />
 * ```
 */
const HeaderStackedStandard: React.FC<HeaderStackedStandardProps> = ({
  onBack,
  backButtonProps,
  onClose,
  closeButtonProps,
  titleStandard,
  titleStandardProps,
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
    if (titleStandard) {
      return titleStandard;
    }
    if (titleStandardProps) {
      return (
        <TitleStandard
          {...titleStandardProps}
          twClassName={`px-4 pt-1 pb-3 ${titleStandardProps?.twClassName ?? ''}`.trim()}
        />
      );
    }
    return null;
  };

  const hasTitleSection = titleStandard || titleStandardProps;

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

      {/* TitleStandard section */}
      {hasTitleSection && (
        <Box testID={titleSectionTestID}>{renderTitleSection()}</Box>
      )}
    </Box>
  );
};

export default HeaderStackedStandard;
