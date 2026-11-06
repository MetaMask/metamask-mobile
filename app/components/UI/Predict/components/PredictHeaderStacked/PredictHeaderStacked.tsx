import React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  type ButtonIconProps,
} from '@metamask/design-system-react-native';
import HeaderRootGlass from '../../../../../component-library/components-temp/HeaderRootGlass';
import HubProfileButton from '../../../../Nav/Main/FixedTabNav/HubProfileButton';
import HeaderStandardAnimatedGlass from '../../../../../component-library/components-temp/HeaderStandardAnimatedGlass';
import ButtonIconGlass from '../../../../../component-library/components-temp/ButtonIconGlass';
import { PredictVenueSelectorButton } from '../../../PredictNext/venueSelection';
import type { SharedValue } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import {
  PredictMarketListSelectorsIDs,
  PredictSearchSelectorsIDs,
} from '../../Predict.testIds';
import { PREDICT_HEADER_STACKED_TEST_IDS } from './PredictHeaderStacked.testIds';

export interface PredictHeaderStackedProps {
  /**
   * Scroll offset shared value from the page's Animated.ScrollView.
   * Drives the compact title transition once it passes the title section.
   */
  scrollY: SharedValue<number>;
  /**
   * Measured height of the large title section (first scroll child).
   * The compact title appears once `scrollY >= titleSectionHeight`.
   */
  titleSectionHeight: SharedValue<number>;
  /**
   * Title shown both as the large title (by the page) and the compact title.
   * Defaults to the shared "Predictions" string.
   */
  title?: string;
  /** Back button handler. Omitted on the Trade hub, which uses the root header. */
  onBack?: () => void;
  /**
   * `root` matches the Money tab header: a left title and the page buttons.
   * `stacked` is the collapsing nav used when this screen is pushed.
   */
  variant?: 'stacked' | 'root';
  /** Search icon handler. Opens the existing Predict search flow. */
  onSearchPress: () => void;
  /**
   * Floats the header over the page on its glass backdrop, with back and
   * search in capsules, as on the brand refresh.
   */
  isGlass?: boolean;
  /** Reports the floating header's height; pair with `useHeaderGlassInset`. */
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Off keeps the header in the scroll instead of pinning it. */
  isFloating?: boolean;
  testID?: string;
}

/**
 * Predict-specific stacked/collapsing navigation header.
 *
 * Thin wrapper over `HeaderStandardAnimatedGlass`, baking in the
 * Predict back navigation, the venue picker (absent unless more than one
 * Venue is selectable) and the search icon. The large title is rendered by the
 * consuming page as the first scroll child; this component renders the nav bar
 * with the compact title that fades/slides in on scroll (Figma
 * HeaderStackedStandard behavior).
 */
const PredictHeaderStacked: React.FC<PredictHeaderStackedProps> = ({
  scrollY,
  titleSectionHeight,
  title = strings('wallet.predict'),
  onBack,
  onSearchPress,
  isGlass = false,
  onLayout,
  isFloating = true,
  variant = 'stacked',
  testID = PREDICT_HEADER_STACKED_TEST_IDS.HEADER,
}) => {
  const searchButtonProps: ButtonIconProps = {
    iconName: IconName.Search,
    size: ButtonIconSize.Md,
    onPress: onSearchPress,
    accessibilityLabel: strings('predict.search_placeholder'),
    testID: PredictSearchSelectorsIDs.SEARCH_BUTTON,
  };

  const headerActions = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
    >
      <PredictVenueSelectorButton variant={isGlass ? 'glass' : 'standard'} />
      {isGlass ? (
        <ButtonIconGlass isCapsule {...searchButtonProps} />
      ) : (
        <ButtonIcon {...searchButtonProps} />
      )}
    </Box>
  );

  if (variant === 'root') {
    return (
      <HeaderRootGlass
        isGlass={isGlass}
        isFloating={isFloating}
        onLayout={onLayout}
        testID={testID}
        includesTopInset
        scrollY={scrollY}
        endAccessory={headerActions}
      >
        <HubProfileButton />
      </HeaderRootGlass>
    );
  }

  return (
    <HeaderStandardAnimatedGlass
      isGlass={isGlass}
      isFloating={isFloating}
      onLayout={onLayout}
      testID={testID}
      includesTopInset
      title={title}
      titleProps={{ testID: PREDICT_HEADER_STACKED_TEST_IDS.COMPACT_TITLE }}
      scrollY={scrollY}
      titleSectionHeight={titleSectionHeight}
      onBack={onBack}
      backButtonProps={{
        accessibilityLabel: strings('navigation.back'),
        testID: PredictMarketListSelectorsIDs.BACK_BUTTON,
      }}
      endAccessory={headerActions}
    />
  );
};

export default PredictHeaderStacked;
