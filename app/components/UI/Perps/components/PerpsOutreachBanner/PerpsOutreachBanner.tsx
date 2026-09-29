import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable } from 'react-native';
import Animated, { SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimationDuration } from '@metamask/design-tokens';
import {
  Theme,
  ThemeProvider,
  useTailwind,
} from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { PERPS_EVENT_PROPERTY } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import AppConstants from '../../../../../core/AppConstants';
import SharedDeeplinkManager from '../../../../../core/DeeplinkManager/DeeplinkManager';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsOutreachCampaign } from '../../hooks/usePerpsOutreachCampaign';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsOutreachBannerSelectorsIDs } from './PerpsOutreachBanner.testIds';

export const PERPS_OUTREACH_BANNER_INTERACTION = {
  VIEWED: 'outreach_banner_viewed',
  TAPPED: 'outreach_banner_tapped',
  DISMISSED: 'outreach_banner_dismissed',
} as const;

export type PerpsOutreachBannerLocation = 'perps_home' | 'perp_market_details';

interface PerpsOutreachBannerProps {
  /**
   * Set on surfaces where the banner sits above a header that would otherwise
   * apply the status-bar inset itself, so the banner's background reaches the
   * top edge of the screen.
   */
  includesTopInset?: boolean;
  /**
   * Perps surface where the campaign impression or interaction occurred.
   */
  location: PerpsOutreachBannerLocation;
}

const PerpsOutreachBannerContent = ({
  includesTopInset = false,
  location,
}: PerpsOutreachBannerProps) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const { campaign, dismiss } = usePerpsOutreachCampaign();
  const { track } = usePerpsEventTracking();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [campaign?.imageUrl]);

  const linkUrl = campaign?.linkUrl ?? null;
  const campaignId = campaign?.id;

  useEffect(() => {
    if (!campaignId) {
      return;
    }

    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_OUTREACH_BANNER_INTERACTION.VIEWED,
      [PERPS_EVENT_PROPERTY.LOCATION]: location,
      campaign_id: campaignId,
    });
  }, [campaignId, location, track]);

  const handlePress = useCallback(() => {
    if (!linkUrl || !campaignId) {
      return;
    }
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_OUTREACH_BANNER_INTERACTION.TAPPED,
      [PERPS_EVENT_PROPERTY.LOCATION]: location,
      campaign_id: campaignId,
    });
    SharedDeeplinkManager.getInstance()
      .parse(linkUrl, {
        origin: AppConstants.DEEPLINKS.ORIGIN_PERPS_OUTREACH,
      })
      .catch((error) => {
        DevLogger.log('[PerpsOutreachBanner] deeplink parsing failed:', error);
      });
  }, [campaignId, linkUrl, location, track]);

  const handleDismiss = useCallback(() => {
    if (campaignId) {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_OUTREACH_BANNER_INTERACTION.DISMISSED,
        [PERPS_EVENT_PROPERTY.LOCATION]: location,
        campaign_id: campaignId,
      });
    }
    dismiss();
  }, [campaignId, dismiss, location, track]);

  if (!campaign) {
    return null;
  }

  const showImage = Boolean(campaign.imageUrl) && !imageFailed;
  const isTappable = Boolean(linkUrl);

  return (
    <Animated.View
      entering={SlideInUp.duration(AnimationDuration.Promptly)}
      style={[
        tw.style('w-full bg-accent02-light'),
        includesTopInset && { paddingTop: insets.top },
      ]}
      testID={PerpsOutreachBannerSelectorsIDs.BANNER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        gap={2}
        twClassName="px-4 pb-3"
      >
        {/*
          The close button stays a sibling of this Pressable rather than a
          child: on Android a nested pressable does not reliably stop the
          parent `onPress`, so dismissing could also route the deeplink and
          open the details sheet.
        */}
        <Pressable
          onPress={isTappable ? handlePress : undefined}
          disabled={!isTappable}
          accessibilityRole={isTappable ? 'button' : undefined}
          style={tw.style('min-w-0 flex-1')}
          testID={PerpsOutreachBannerSelectorsIDs.CONTENT}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Start}
            gap={4}
          >
            {showImage ? (
              <Box
                alignItems={BoxAlignItems.Center}
                twClassName="h-[72px] w-[72px] overflow-hidden rounded-lg p-2"
              >
                <Image
                  source={{ uri: campaign.imageUrl }}
                  resizeMode="cover"
                  // rounded-lg on the Image itself (not just the wrapper) so
                  // future opaque assets don't show square corners inside the
                  // padded rounded frame.
                  style={tw.style('h-14 w-14 rounded-lg')}
                  onError={() => setImageFailed(true)}
                  testID={PerpsOutreachBannerSelectorsIDs.IMAGE}
                />
              </Box>
            ) : null}

            <Box twClassName="min-w-0 flex-1 gap-0.5">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {campaign.title}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {campaign.body}
              </Text>
            </Box>
          </Box>
        </Pressable>

        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Sm}
          onPress={handleDismiss}
          accessibilityLabel={strings('navigation.close')}
          testID={PerpsOutreachBannerSelectorsIDs.CLOSE_BUTTON}
        />
      </Box>
    </Animated.View>
  );
};

/**
 * Dismissible outreach banner shown above the header on Perps surfaces.
 *
 * The background is the light accent colour in both app themes, so the subtree
 * is pinned to the light theme to keep the text and close icon readable on it.
 */
const PerpsOutreachBanner = (props: PerpsOutreachBannerProps) => (
  <ThemeProvider theme={Theme.Light}>
    <PerpsOutreachBannerContent {...props} />
  </ThemeProvider>
);

export default PerpsOutreachBanner;
