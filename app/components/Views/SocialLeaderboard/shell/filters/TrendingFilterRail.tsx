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

/** Wide enough for the fade to cover the icon and the pills that pass under it. */
const FADE_WIDTH = 88;

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
          colors={['transparent', colors.background.default]}
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
      </View>
    </Box>
  );
};

export default TrendingFilterRail;
