import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, type TextLayoutEvent } from 'react-native';
import {
  Box,
  FontWeight,
  SectionHeader,
  Text,
  TextColor,
  TextVariant,
  type TextProps,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsMarketDetailsViewSelectorsIDs } from '../../Perps.testIds';

/** Collapsed description is limited to this many lines before "Read more". */
export const PERPS_MARKET_ABOUT_COLLAPSED_LINES = 3;

const styles = StyleSheet.create({
  /**
   * Invisible full-height measurement text. Must stay in the layout width of
   * the visible description so line wrapping matches, but must not affect
   * visual layout or accessibility.
   */
  measureText: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    zIndex: -1,
  },
});

export interface PerpsMarketAboutSectionProps {
  /**
   * Human-readable description of the underlying asset, sourced from the
   * Hyperliquid/Terminal market metadata.
   */
  description?: string;
  /**
   * Display name of the asset (e.g. 'Bitcoin', 'NVIDIA'), used in the
   * section title as "About {assetName}".
   */
  assetName?: string;
  /**
   * Optional test ID for the section container.
   */
  testID?: string;
}

/**
 * PerpsMarketAboutSection
 *
 * Renders a short "About {asset}" description of the underlying asset on the
 * Lite market detail screen. The body is collapsed to 3 lines with a "Read
 * more" control; expanding removes the control. The section is entirely
 * hidden when no description is available.
 */
const PerpsMarketAboutSection: React.FC<PerpsMarketAboutSectionProps> = ({
  description,
  assetName,
  testID = PerpsMarketDetailsViewSelectorsIDs.ABOUT_SECTION,
}) => {
  const trimmedDescription = description?.trim() ?? '';
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [hasMeasured, setHasMeasured] = useState(false);

  // Re-measure truncation when the description changes (e.g. market switch).
  useEffect(() => {
    setIsExpanded(false);
    setIsTruncated(false);
    setHasMeasured(false);
  }, [trimmedDescription]);

  /**
   * Measure against an unrestricted (hidden) copy of the text. Measuring the
   * clamped text itself is unreliable: with `numberOfLines` set, RN caps the
   * reported lines and joined line text often still matches the source, so
   * "Read more" never appears.
   */
  const handleMeasureTextLayout = useCallback(
    (event: TextLayoutEvent) => {
      if (hasMeasured) {
        return;
      }
      const lineCount = event.nativeEvent.lines.length;
      setIsTruncated(lineCount > PERPS_MARKET_ABOUT_COLLAPSED_LINES);
      setHasMeasured(true);
    },
    [hasMeasured],
  );

  const handleReadMorePress = useCallback(() => {
    setIsExpanded(true);
  }, []);

  // Graceful fallback: render nothing when there is no description (AC2).
  if (!trimmedDescription) {
    return null;
  }

  const titleAssetName = assetName?.trim() || undefined;
  const title = titleAssetName
    ? strings('perps.market.about_asset', { assetName: titleAssetName })
    : strings('perps.market.about');

  const showReadMore = !isExpanded && isTruncated;

  return (
    <Box paddingBottom={3} testID={testID}>
      <SectionHeader
        title={
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {title}
          </Text>
        }
      />

      <Box paddingHorizontal={4} gap={2}>
        {/*
          Shared width wrapper so the hidden unrestricted measure text wraps
          identically to the visible clamped description.
        */}
        <Box>
          {!hasMeasured ? (
            <Text
              variant={TextVariant.BodyMd}
              style={styles.measureText}
              onTextLayout={
                handleMeasureTextLayout as TextProps['onTextLayout']
              }
              pointerEvents="none"
              testID={`${PerpsMarketDetailsViewSelectorsIDs.ABOUT_DESCRIPTION}-measure`}
            >
              {trimmedDescription}
            </Text>
          ) : null}

          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            numberOfLines={
              isExpanded ? undefined : PERPS_MARKET_ABOUT_COLLAPSED_LINES
            }
            ellipsizeMode="tail"
            testID={PerpsMarketDetailsViewSelectorsIDs.ABOUT_DESCRIPTION}
          >
            {trimmedDescription}
          </Text>
        </Box>

        {showReadMore ? (
          <Pressable
            onPress={handleReadMorePress}
            accessibilityRole="button"
            accessibilityLabel={strings('perps.market.read_more')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={PerpsMarketDetailsViewSelectorsIDs.ABOUT_READ_MORE}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Bold}
              twClassName="underline"
            >
              {strings('perps.market.read_more')}
            </Text>
          </Pressable>
        ) : null}
      </Box>
    </Box>
  );
};

export default PerpsMarketAboutSection;
