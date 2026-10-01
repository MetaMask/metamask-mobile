import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AnimationDuration } from '@metamask/design-tokens';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useSupportConsent } from '../../../../hooks/useSupportConsent';
import { selectPerpsServiceInterruptionBannerEnabledFlag } from '../../selectors/featureFlags';
import {
  SERVICE_INTERRUPTION_CONFIG,
  SUPPORT_CONFIG,
} from '../../constants/perpsConfig';
import type { PerpsServiceInterruptionBannerProps } from './PerpsServiceInterruptionBanner.types';

/**
 * Scroll offset past which the description collapses. Kept separate from the
 * expand threshold so a banner that just collapsed (and thereby grew the
 * scroll viewport) cannot immediately re-expand from the resulting clamp.
 */
export const SERVICE_INTERRUPTION_BANNER_COLLAPSE_SCROLL_PX = 32;
export const SERVICE_INTERRUPTION_BANNER_EXPAND_SCROLL_PX = 8;

const styles = StyleSheet.create({
  descriptionWrapper: {
    overflow: 'hidden',
  },
});

type DescriptionLink = 'faq' | 'support';

interface DescriptionSegment {
  text: string;
  link?: DescriptionLink;
}

/**
 * Sentinels passed as `{{faqLink}}` / `{{supportLink}}` interpolation values.
 * Null bytes cannot appear in locale copy, so a match is the placeholder
 * itself. Searching for the translated label would miss every locale that
 * has not adopted the placeholders, and would break if a translator changed
 * capitalisation inside the label.
 */
export const SERVICE_INTERRUPTION_LINK_PLACEHOLDERS = {
  faq: '\u0000faqLink\u0000',
  support: '\u0000supportLink\u0000',
} as const;

const LINK_PLACEHOLDERS: { token: string; link: DescriptionLink }[] = [
  {
    token: SERVICE_INTERRUPTION_LINK_PLACEHOLDERS.faq,
    link: 'faq',
  },
  {
    token: SERVICE_INTERRUPTION_LINK_PLACEHOLDERS.support,
    link: 'support',
  },
];

/**
 * Splits a description template into plain text and link segments.
 * `template` is the `strings()` result after substituting
 * {@link SERVICE_INTERRUPTION_LINK_PLACEHOLDERS} for `{{faqLink}}` and
 * `{{supportLink}}`, so translators control link order. A link whose
 * placeholder is absent is appended, which keeps both actions reachable in
 * locales that still ship the previous sentence.
 */
export const buildDescriptionSegments = (
  template: string,
  faqLabel: string,
  supportLabel: string,
): DescriptionSegment[] => {
  const labelByLink: Record<DescriptionLink, string> = {
    faq: faqLabel,
    support: supportLabel,
  };

  const segments: DescriptionSegment[] = [];
  const usedLinks = new Set<DescriptionLink>();
  let remaining = template;

  while (remaining.length > 0) {
    let nextIndex = -1;
    let nextPlaceholder: (typeof LINK_PLACEHOLDERS)[number] | undefined;
    for (const candidate of LINK_PLACEHOLDERS) {
      const index = remaining.indexOf(candidate.token);
      if (index !== -1 && (nextIndex === -1 || index < nextIndex)) {
        nextIndex = index;
        nextPlaceholder = candidate;
      }
    }

    if (!nextPlaceholder) {
      segments.push({ text: remaining });
      break;
    }

    if (nextIndex > 0) {
      segments.push({ text: remaining.slice(0, nextIndex) });
    }

    const label = labelByLink[nextPlaceholder.link];
    if (label.length > 0) {
      segments.push({ text: label, link: nextPlaceholder.link });
      usedLinks.add(nextPlaceholder.link);
    }

    remaining = remaining.slice(nextIndex + nextPlaceholder.token.length);
  }

  for (const { link } of LINK_PLACEHOLDERS) {
    const label = labelByLink[link];
    if (usedLinks.has(link) || label.length === 0) {
      continue;
    }
    if (segments.length > 0) {
      segments.push({ text: '\n' });
    }
    segments.push({ text: label, link });
  }

  return segments;
};

const PerpsServiceInterruptionBanner: React.FC<
  PerpsServiceInterruptionBannerProps
> = ({
  testID = 'perps-service-interruption-banner',
  scrollY,
  includesTopInset = false,
}) => {
  const isEnabled = useSelector(
    selectPerpsServiceInterruptionBannerEnabledFlag,
  );
  const navigation = useNavigation<AppNavigationProp>();
  const { openSupportWithConsent } = useSupportConsent();
  const insets = useSafeAreaInsets();

  // Collapsed state lives in React so the description can be hidden from
  // accessibility and tests; the height itself is driven on the UI thread so
  // the header and content beneath slide with it frame by frame.
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isCollapsedSv = useSharedValue(false);
  const collapseProgress = useSharedValue(0);
  const descriptionHeight = useSharedValue(0);

  useAnimatedReaction(
    () => scrollY?.value ?? 0,
    (offset) => {
      const shouldCollapse = isCollapsedSv.value
        ? offset > SERVICE_INTERRUPTION_BANNER_EXPAND_SCROLL_PX
        : offset > SERVICE_INTERRUPTION_BANNER_COLLAPSE_SCROLL_PX;
      if (shouldCollapse === isCollapsedSv.value) {
        return;
      }
      isCollapsedSv.value = shouldCollapse;
      scheduleOnRN(setIsCollapsed, shouldCollapse);
    },
    [scrollY],
  );

  useEffect(() => {
    collapseProgress.value = withTiming(isCollapsed ? 1 : 0, {
      duration: AnimationDuration.Fast,
    });
  }, [collapseProgress, isCollapsed]);

  const handleDescriptionLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height > 0) {
        descriptionHeight.value = height;
      }
    },
    [descriptionHeight],
  );

  const descriptionWrapperStyle = useAnimatedStyle(() => {
    const measuredHeight = descriptionHeight.value;
    return {
      opacity: 1 - collapseProgress.value,
      // Until measured, let the wrapper size itself so the first layout pass
      // can report the natural description height.
      height:
        measuredHeight > 0
          ? measuredHeight * (1 - collapseProgress.value)
          : undefined,
    };
  });

  const handleSupportPress = useCallback(() => {
    openSupportWithConsent(
      (url) =>
        navigation.navigate(Routes.WEBVIEW.MAIN, {
          screen: Routes.WEBVIEW.SIMPLE,
          params: {
            url,
            title: strings(SUPPORT_CONFIG.TitleKey),
          },
        }),
      SUPPORT_CONFIG.Url,
    );
  }, [navigation, openSupportWithConsent]);

  const handleFaqPress = useCallback(() => {
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: SERVICE_INTERRUPTION_CONFIG.FaqUrl,
        title: strings(SERVICE_INTERRUPTION_CONFIG.FaqTitleKey),
      },
    });
  }, [navigation]);

  const descriptionSegments = useMemo(() => {
    const faqLabel = strings('perps.service_interruption.faq_link');
    const supportLabel = strings('perps.service_interruption.contact_support');
    return buildDescriptionSegments(
      strings('perps.service_interruption.description', {
        faqLink: SERVICE_INTERRUPTION_LINK_PLACEHOLDERS.faq,
        supportLink: SERVICE_INTERRUPTION_LINK_PLACEHOLDERS.support,
      }),
      faqLabel,
      supportLabel,
    );
  }, []);

  if (!isEnabled) {
    return null;
  }

  return (
    <Box
      style={includesTopInset ? { paddingTop: insets.top } : undefined}
      testID={testID}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        gap={3}
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
        twClassName="rounded-xl pl-4 pr-2 pt-2 pb-3"
      >
        <Box twClassName="pt-1">
          <Icon
            name={IconName.Danger}
            size={IconSize.Sm}
            color={IconColor.WarningDefault}
            testID={`${testID}-icon`}
          />
        </Box>
        <Box twClassName="flex-1 pt-1">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.WarningDefault}
            testID={`${testID}-title`}
          >
            {strings('perps.service_interruption.title')}
          </Text>
          <Animated.View
            style={[styles.descriptionWrapper, descriptionWrapperStyle]}
            accessibilityElementsHidden={isCollapsed}
            importantForAccessibility={
              isCollapsed ? 'no-hide-descendants' : 'auto'
            }
            pointerEvents={isCollapsed ? 'none' : 'auto'}
            testID={`${testID}-description`}
          >
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              onLayout={handleDescriptionLayout}
            >
              {descriptionSegments.map((segment, index) =>
                segment.link ? (
                  <Text
                    key={`${segment.link}-${index}`}
                    variant={TextVariant.BodyXs}
                    color={TextColor.TextAlternative}
                    twClassName="underline"
                    onPress={
                      segment.link === 'faq'
                        ? handleFaqPress
                        : handleSupportPress
                    }
                    accessibilityRole="link"
                    testID={`${testID}-${segment.link}-link`}
                  >
                    {segment.text}
                  </Text>
                ) : (
                  <React.Fragment key={`text-${index}`}>
                    {segment.text}
                  </React.Fragment>
                ),
              )}
            </Text>
          </Animated.View>
        </Box>
      </Box>
    </Box>
  );
};

export default PerpsServiceInterruptionBanner;
