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
import TitleSubpage from '../TitleSubpage';
import { HeaderStackedSubpageProps } from './HeaderStackedSubpage.types';

/**
 * HeaderStackedSubpage is a header component that combines HeaderBase (with back button)
 * on top and a TitleSubpage section below it.
 *
 * @example
 * ```tsx
 * <HeaderStackedSubpage
 *   onBack={handleBack}
 *   titleSubpageProps={{
 *     title: "Token Name",
 *     bottomLabel: "$1,234.56",
 *   }}
 * />
 * ```
 */
const HeaderStackedSubpage: React.FC<HeaderStackedSubpageProps> = ({
  onBack,
  backButtonProps,
  onClose,
  closeButtonProps,
  titleSubpage,
  titleSubpageProps,
  startButtonIconProps,
  endButtonIconProps,
  twClassName = '',
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
    if (titleSubpage) {
      return titleSubpage;
    }
    if (titleSubpageProps) {
      return (
        <TitleSubpage
          {...titleSubpageProps}
          twClassName={`px-4 pt-1 pb-3 ${titleSubpageProps?.twClassName ?? ''}`.trim()}
        />
      );
    }
    return null;
  };

  const hasTitleSection = titleSubpage || titleSubpageProps;

  return (
    <Box testID={testID}>
      {/* HeaderBase section */}
      <HeaderBase
        startButtonIconProps={resolvedStartButtonIconProps}
        endButtonIconProps={resolvedEndButtonIconProps}
        {...headerBaseProps}
        twClassName={`px-2 ${twClassName}`.trim()}
      />

      {/* TitleSubpage section */}
      {hasTitleSection && (
        <Box testID={titleSectionTestID}>{renderTitleSection()}</Box>
      )}
    </Box>
  );
};

export default HeaderStackedSubpage;
