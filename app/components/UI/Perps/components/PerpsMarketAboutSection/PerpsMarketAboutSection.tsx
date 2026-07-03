import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View, type TextLayoutEvent } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsMarketAboutSectionSelectorsIDs } from '../../Perps.testIds';
import {
  MARKET_ABOUT_COLLAPSED_NUMBER_OF_LINES,
  MARKET_ABOUT_TOGGLE_HIT_SLOP,
} from '../../constants/perpsUIConfig';
import { getMarketAboutDisplayedEventProperties } from '../../utils/marketAbout';
import styleSheet from './PerpsMarketAboutSection.styles';
import type { PerpsMarketAboutSectionProps } from './PerpsMarketAboutSection.types';

/**
 * "About" section shown on the Perps market details screen (TAT-2308).
 *
 * Renders a short, human-readable description of the underlying asset. The
 * description is collapsed to a few lines with a "Read more" / "Show less"
 * toggle when it overflows.
 *
 * The section renders nothing when the market has no (non-whitespace)
 * description, so callers can mount it unconditionally once the feature flag is
 * enabled.
 */
const PerpsMarketAboutSection: React.FC<PerpsMarketAboutSectionProps> = ({
  market,
  collapsedNumberOfLines = MARKET_ABOUT_COLLAPSED_NUMBER_OF_LINES,
}) => {
  const { styles } = useStyles(styleSheet, {});

  const description = market?.description?.trim();

  const [isExpanded, setIsExpanded] = useState(false);
  // Full (unclamped) line count of the description, measured off-screen so we
  // can reliably decide whether the "Read more" toggle is needed.
  const [lineCount, setLineCount] = useState<number | null>(null);

  // Reset when the content or clamp changes (e.g. navigating between markets
  // while the component stays mounted).
  useEffect(() => {
    setIsExpanded(false);
    setLineCount(null);
  }, [description, collapsedNumberOfLines]);

  const handleMeasureLayout = useCallback((event: TextLayoutEvent) => {
    const measuredLines = event.nativeEvent.lines.length;
    // Keep the latest measurement so a re-layout (width/font/content change)
    // updates the toggle instead of freezing on the first measured value.
    setLineCount((prev) => (prev === measuredLines ? prev : measuredLines));
  }, []);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const isTruncatable =
    lineCount !== null && lineCount > collapsedNumberOfLines;

  const displayedEventProperties = useMemo(
    () => getMarketAboutDisplayedEventProperties(market, description ?? ''),
    [market, description],
  );

  // AC4: fire once when the section is rendered because a description exists.
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_UI_INTERACTION,
    resetKey: market?.symbol,
    conditions: [Boolean(description)],
    properties: displayedEventProperties,
  });

  if (!description) {
    return null;
  }

  const toggleLabel = strings(
    isExpanded
      ? 'perps.market.about_show_less'
      : 'perps.market.about_read_more',
  );

  return (
    <View
      style={styles.container}
      testID={PerpsMarketAboutSectionSelectorsIDs.CONTAINER}
    >
      <Text
        variant={TextVariant.HeadingMD}
        color={TextColor.Default}
        testID={PerpsMarketAboutSectionSelectorsIDs.TITLE}
      >
        {strings('perps.market.about', {
          name: market.name?.trim() || market.symbol,
        })}
      </Text>

      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        numberOfLines={isExpanded ? undefined : collapsedNumberOfLines}
        testID={PerpsMarketAboutSectionSelectorsIDs.DESCRIPTION}
      >
        {description}
      </Text>

      {/* Off-screen, non-interactive copy used only to measure the full line
          count so we know whether the description overflows the clamp. */}
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.measuringText}
        onTextLayout={handleMeasureLayout}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID={PerpsMarketAboutSectionSelectorsIDs.DESCRIPTION_MEASURE}
      >
        {description}
      </Text>

      {isTruncatable ? (
        <TouchableOpacity
          onPress={handleToggle}
          testID={PerpsMarketAboutSectionSelectorsIDs.TOGGLE}
          accessibilityRole="button"
          accessibilityLabel={toggleLabel}
          accessibilityState={{ expanded: isExpanded }}
          hitSlop={MARKET_ABOUT_TOGGLE_HIT_SLOP}
        >
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Default}
            style={styles.toggle}
          >
            {toggleLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default memo(PerpsMarketAboutSection);
