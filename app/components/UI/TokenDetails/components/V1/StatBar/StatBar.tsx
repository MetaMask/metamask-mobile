import React, { useCallback, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import DottedUnderline from '../../../../DottedUnderline';
import type { TokenDetailsVariant } from '../../../constants/constants';
import {
  STAT_EMPTY_VALUE,
  STAT_KEYS_BY_VARIANT,
  STAT_LABEL_KEYS,
} from './StatBar.constants';
import { StatBarSelectors } from './StatBar.testIds';
import type {
  TokenStatKey,
  TokenStatValue,
  TokenStatValues,
} from './StatBar.types';

/**
 * Keeps digits a fixed width so values that tick live — price-derived stats
 * like 24h high/low — do not shift the cells beside them on every update.
 */
const TABULAR_NUMS = { fontVariant: ['tabular-nums' as const] };

const STAT_SCROLL_FADE_REMAINING_PX = 1;

const hasMoreStatsToScroll = (
  contentWidth: number,
  viewportWidth: number,
  scrollX: number,
) => contentWidth - viewportWidth - scrollX > STAT_SCROLL_FADE_REMAINING_PX;

const transparentBackground = (color: string) =>
  color.startsWith('#') && color.length === 7 ? `${color}00` : 'transparent';

interface StatBarItemProps {
  statKey: TokenStatKey;
  stat?: TokenStatValue;
  /** Drops the leading padding so the first value aligns with the page gutter. */
  isFirst: boolean;
  /** Drops the trailing rule so the bar does not end on a divider. */
  isLast: boolean;
  onPress?: (statKey: TokenStatKey) => void;
}

const StatBarItem: React.FC<StatBarItemProps> = ({
  statKey,
  stat,
  isFirst,
  isLast,
  onPress,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const label = strings(STAT_LABEL_KEYS[statKey]);
  const hasValue = stat?.value != null;

  const handlePress = useCallback(() => onPress?.(statKey), [onPress, statKey]);

  let valueColor: TextColor = TextColor.TextDefault;
  if (!hasValue) {
    valueColor = TextColor.TextAlternative;
  } else if (stat?.isWarning) {
    valueColor = TextColor.WarningDefault;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Start}
      twClassName={`shrink-0 px-5 ${isFirst ? 'pl-0' : 'min-w-24'} ${
        isLast ? '' : 'border-r border-muted'
      }`}
      testID={StatBarSelectors.cell(statKey)}
    >
      {stat?.isLoading && !hasValue ? (
        // Sized to the heading it replaces so the cell does not resize when
        // the value lands.
        <Skeleton
          style={tw.style('h-[22px] w-16 rounded-md')}
          testID={StatBarSelectors.skeleton(statKey)}
        />
      ) : (
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Medium}
          color={valueColor}
          numberOfLines={1}
          style={TABULAR_NUMS}
          testID={StatBarSelectors.value(statKey)}
        >
          {stat?.value ?? STAT_EMPTY_VALUE}
        </Text>
      )}

      <TouchableOpacity
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={strings('token_details_v1.stats.explain', {
          stat: label,
        })}
        testID={StatBarSelectors.label(statKey)}
      >
        {/* Marks the label as tappable for an explanation. The shared
            component sizes the rule to the text and offsets it, which a text
            decoration cannot do — it sits hard against the baseline. */}
        <DottedUnderline
          color={colors.text.alternative}
          testID={StatBarSelectors.underlineWrapper(statKey)}
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            twClassName="-mt-0.5"
          >
            {label}
          </Text>
        </DottedUnderline>
      </TouchableOpacity>
    </Box>
  );
};

export interface StatBarProps {
  /** Decides which stats appear and in what order. */
  variant: TokenDetailsVariant;
  /** Formatted values. A key with no entry renders the gray dash. */
  stats: TokenStatValues;
  /** Opens the explainer for a stat. */
  onStatPress?: (statKey: TokenStatKey) => void;
}

/**
 * Horizontal bar of token statistics, sitting between two full-width rules
 * below the Token Details V1 security and social row.
 *
 * Always open and never reorderable: ASSETS-4019 dropped the collapse and the
 * saved per-user order. About four stats fit on screen and the rest scroll
 * sideways.
 *
 * The bar owns its own horizontal padding rather than inheriting the page
 * gutter, so the two rules run edge to edge while the content still lines up
 * with the sections above.
 */
export const StatBar: React.FC<StatBarProps> = ({
  variant,
  stats,
  onStatPress,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const statKeys = STAT_KEYS_BY_VARIANT[variant];
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const showScrollFade = hasMoreStatsToScroll(
    contentWidth,
    viewportWidth,
    scrollX,
  );

  return (
    <Box
      twClassName="border-t border-b border-muted"
      testID={StatBarSelectors.BAR}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onLayout={(event) => {
          setViewportWidth(event.nativeEvent.layout.width);
        }}
        onContentSizeChange={(width) => {
          setContentWidth(width);
        }}
        onScroll={(event) => {
          setScrollX(event.nativeEvent.contentOffset.x);
        }}
        contentContainerStyle={tw.style('flex-row px-4 pt-3.5 pb-[18px]')}
        testID={StatBarSelectors.SCROLL}
      >
        {statKeys.map((statKey, index) => (
          <StatBarItem
            key={statKey}
            statKey={statKey}
            stat={stats[statKey]}
            isFirst={index === 0}
            isLast={index === statKeys.length - 1}
            onPress={onStatPress}
          />
        ))}
      </ScrollView>
      {showScrollFade ? (
        <LinearGradient
          pointerEvents="none"
          colors={[
            transparentBackground(colors.background.default),
            colors.background.default,
          ]}
          locations={[0, 0.85]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tw.style('absolute inset-y-0 right-0 w-20')}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID={StatBarSelectors.SCROLL_FADE}
        />
      ) : null}
    </Box>
  );
};

export default StatBar;
