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

interface DescriptionLinkLabel {
  label: string;
  link: DescriptionLink;
}

/**
 * Splits the translated description back into plain text and link segments.
 * The whole sentence goes through one `strings()` call so translators can
 * place both links anywhere; the link labels are then located in the result
 * and rendered as pressable text in place.
 */
export const buildDescriptionSegments = (
  sentence: string,
  faqLabel: string,
  supportLabel: string,
): DescriptionSegment[] => {
  const links: DescriptionLinkLabel[] = [
    { label: faqLabel, link: 'faq' },
    { label: supportLabel, link: 'support' },
  ];
  const presentLinks = links.filter(({ label }) => label.length > 0);

  const segments: DescriptionSegment[] = [];
  let remaining = sentence;

  while (remaining.length > 0) {
    let nextIndex = -1;
    let nextLink: DescriptionLinkLabel | undefined;
    for (const candidate of presentLinks) {
      const index = remaining.indexOf(candidate.label);
      if (index !== -1 && (nextIndex === -1 || index < nextIndex)) {
        nextIndex = index;
        nextLink = candidate;
      }
    }

    if (!nextLink) {
      segments.push({ text: remaining });
      break;
    }

    if (nextIndex > 0) {
      segments.push({ text: remaining.slice(0, nextIndex) });
    }
    segments.push({ text: nextLink.label, link: nextLink.link });
    remaining = remaining.slice(nextIndex + nextLink.label.length);
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
        faqLink: faqLabel,
        supportLink: supportLabel,
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
