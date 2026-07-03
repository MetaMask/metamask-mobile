import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TouchableOpacity,
  View,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';
import { PERPS_EVENT_PROPERTY } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsMarketAboutSectionSelectorsIDs } from '../../Perps.testIds';
import styleSheet from './PerpsMarketAboutSection.styles';
import type { PerpsMarketAboutSectionProps } from './PerpsMarketAboutSection.types';

const DEFAULT_COLLAPSED_NUMBER_OF_LINES = 3;

/**
 * Interaction type values for the market About section (TAT-2308).
 *
 * These are not (yet) part of `PERPS_EVENT_VALUE.INTERACTION_TYPE` in
 * `@metamask/perps-controller`, so they are declared locally to keep the
 * Mixpanel contract defined by the ticket in one place.
 */
export const MARKET_ABOUT_INTERACTION_TYPE = {
  DISPLAYED: 'market_about_section_displayed',
} as const;

/**
 * Resolves the analytics `market_type` value for a market, mapping HIP-3
 * markets to a dedicated `hip3` bucket as required by the instrumentation spec.
 */
const getMarketTypeForAnalytics = (
  market: PerpsMarketAboutSectionProps['market'],
): string => {
  if (market.isHip3) {
    return 'hip3';
  }
  return market.marketType ?? 'crypto';
};

/**
 * "About" section shown on the Perps market details screen (TAT-2308).
 *
 * Renders a short, human-readable description of the underlying asset. The
 * description is collapsed to a few lines with a "Read more" / "Show less"
 * toggle when it overflows.
 *
 * The section renders nothing when the market has no description, so callers
 * can mount it unconditionally once the feature flag is enabled.
 */
const PerpsMarketAboutSection: React.FC<PerpsMarketAboutSectionProps> = ({
  market,
  collapsedNumberOfLines = DEFAULT_COLLAPSED_NUMBER_OF_LINES,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { track } = usePerpsEventTracking();

  const description = market?.description?.trim();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [hasMeasured, setHasMeasured] = useState(false);

  // Reset the truncation measurement when the description changes (e.g. when
  // navigating between markets while the component stays mounted).
  useEffect(() => {
    setIsExpanded(false);
    setIsTruncated(false);
    setHasMeasured(false);
  }, [description]);

  const handleTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (hasMeasured || !description) {
        return;
      }
      const { lines } = event.nativeEvent;
      const renderedText = lines.map((line) => line.text).join('');
      // When collapsed, the rendered text is clipped to `collapsedNumberOfLines`
      // so a shorter rendered length than the full description means it overflows.
      setIsTruncated(renderedText.length < description.length);
      setHasMeasured(true);
    },
    [description, hasMeasured],
  );

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const displayedEventProperties = useMemo(
    () => ({
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        MARKET_ABOUT_INTERACTION_TYPE.DISPLAYED,
      market_symbol: market?.symbol ?? '',
      market_type: getMarketTypeForAnalytics(market),
      description_length: description?.length ?? 0,
    }),
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
        {strings('perps.market.about', { name: market.name || market.symbol })}
      </Text>

      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        numberOfLines={isExpanded ? undefined : collapsedNumberOfLines}
        onTextLayout={handleTextLayout}
        style={[
          styles.description,
          !hasMeasured && styles.descriptionMeasuring,
        ]}
        testID={PerpsMarketAboutSectionSelectorsIDs.DESCRIPTION}
      >
        {description}
      </Text>

      {isTruncated ? (
        <TouchableOpacity
          onPress={handleToggle}
          testID={PerpsMarketAboutSectionSelectorsIDs.TOGGLE}
          accessibilityRole="button"
        >
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Default}
            style={styles.toggle}
          >
            {strings(
              isExpanded
                ? 'perps.market.about_show_less'
                : 'perps.market.about_read_more',
            )}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default PerpsMarketAboutSection;
