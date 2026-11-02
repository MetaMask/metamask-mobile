import React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { IconName } from '@metamask/design-system-react-native';
import HeaderStandardAnimatedGlass from '../../../../../component-library/components-temp/HeaderStandardAnimatedGlass';
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
  /** Back button handler. */
  onBack: () => void;
  /** Search icon handler. Opens the existing Predict search flow. */
  onSearchPress: () => void;
  /**
   * Floats the header over the page on its glass backdrop, with back and
   * search in capsules, as on the brand refresh.
   */
  isGlass?: boolean;
  /** Reports the floating header's height; pair with `useHeaderGlassInset`. */
  onLayout?: (event: LayoutChangeEvent) => void;
  testID?: string;
}

/**
 * Predict-specific stacked/collapsing navigation header.
 *
 * Thin wrapper over `HeaderStandardAnimatedGlass`, baking in the
 * Predict back navigation and search icon. The large title is rendered by the
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
  testID = PREDICT_HEADER_STACKED_TEST_IDS.HEADER,
}) => (
  <HeaderStandardAnimatedGlass
    isGlass={isGlass}
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
    endButtonIconProps={[
      {
        iconName: IconName.Search,
        onPress: onSearchPress,
        accessibilityLabel: strings('predict.search_placeholder'),
        testID: PredictSearchSelectorsIDs.SEARCH_BUTTON,
      },
    ]}
  />
);

export default PredictHeaderStacked;
