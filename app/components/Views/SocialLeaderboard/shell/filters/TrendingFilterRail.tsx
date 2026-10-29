import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { strings } from '../../../../../../locales/i18n';
import { fireImpact, ImpactMoment } from '../../../../../util/haptics';
import { useTheme } from '../../../../../util/theme';

export const TRENDING_FILTER_RAIL_TEST_ID = 'social-v1-trending-filter-rail';

/** Large icon button is 40px, and the rail keeps it 16px from the screen edge. */
const FILTER_BUTTON_SIZE = 40;
const FILTER_BUTTON_END_INSET = 16;
/** Gradient run before the button. The wash is solid by the time a chip meets it. */
const GRADIENT_LEAD = 56;
const FADE_WIDTH =
  FILTER_BUTTON_END_INSET + FILTER_BUTTON_SIZE + GRADIENT_LEAD;

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: FADE_WIDTH,
  },
});

const GRADIENT_START = { x: 0, y: 0.5 };
const GRADIENT_END = { x: 1, y: 0.5 };
/** Fade across the lead, then hold the page color over the button. */
const GRADIENT_LOCATIONS = [0, GRADIENT_LEAD / FADE_WIDTH, 1];

/** Same-color 0-alpha stop so the wash is white in light and black in dark. */
const fadeFromPageColor = (color: string) =>
  color.startsWith('#') && color.length === 7 ? `${color}00` : color;

export interface TrendingFilterRailProps {
  children: React.ReactNode;
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
  /** Test ID for the filter button. */
  testID: string;
}

/**
 * Trending pill rail with the Custom filters control fixed on the right.
 * The fade sits outside the marquee so pills crawl under it and the icon
 * does not move with them.
 */
const TrendingFilterRail: React.FC<TrendingFilterRailProps> = ({
  children,
  onOpenFilters,
  isFilterActive = false,
  testID,
}) => {
  const { colors } = useTheme();

  return (
    // The feed column leaves 24px under this rail. Cancelling 16px of that
    // leaves 8px, and the first post keeps its own 8px padding, for 16px total.
    <Box
      testID={TRENDING_FILTER_RAIL_TEST_ID}
      twClassName="relative -mb-4 min-h-10"
    >
      {children}
      <View pointerEvents="box-none" style={styles.fade}>
        <LinearGradient
          pointerEvents="none"
          colors={[
            fadeFromPageColor(colors.background.default),
            colors.background.default,
            colors.background.default,
          ]}
          locations={GRADIENT_LOCATIONS}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={StyleSheet.absoluteFill}
        />
        <Box
          alignItems={BoxAlignItems.End}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1 pr-4"
          pointerEvents="box-none"
        >
          <Box
            testID={`${testID}-disc`}
            twClassName="rounded-full bg-default overflow-hidden"
          >
            <ButtonIcon
              iconName={IconName.Filter}
              size={ButtonIconSize.Lg}
              iconProps={{ size: IconSize.Lg }}
              onPress={
                onOpenFilters
                  ? () => {
                      fireImpact(ImpactMoment.SecondaryCTA);
                      onOpenFilters();
                    }
                  : undefined
              }
              testID={testID}
              accessibilityLabel={strings(
                'social_leaderboard.shell.filters.title',
              )}
              accessibilityState={{ selected: isFilterActive }}
              twClassName={
                isFilterActive
                  ? 'rounded-full bg-primary-muted'
                  : 'rounded-full bg-background-muted'
              }
            />
          </Box>
        </Box>
      </View>
    </Box>
  );
};

export default TrendingFilterRail;
