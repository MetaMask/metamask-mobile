import React, { useCallback } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  IconColor,
  IconName,
  Text,
  TextVariant,
  FontWeight,
  BottomSheet,
} from '@metamask/design-system-react-native';
import { type CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { useOptInToCampaign } from '../../hooks/useOptInToCampaign';
import useRewardsToast from '../../hooks/useRewardsToast';
import useCampaignGeoRestriction from '../../hooks/useCampaignGeoRestriction';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';
import RewardsInfoBanner from '../RewardsInfoBanner';
import ContentfulRichText, {
  isDocument,
} from '../ContentfulRichText/ContentfulRichText';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

interface CampaignOptInSheetProps {
  campaign: CampaignDto;
  onClose?: () => void;
  customRestrictedCountries?: Set<string>;
}

/**
 * Bottom sheet shown when a user taps a campaign tile they haven't opted into yet.
 * Shows the campaign title, a legal disclaimer with a tappable terms link, and an opt-in CTA.
 */
const CampaignOptInSheet: React.FC<CampaignOptInSheetProps> = ({
  campaign,
  onClose,
  customRestrictedCountries,
}) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { optInToCampaign, isOptingIn, optInError } = useOptInToCampaign();
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const { isGeoRestricted, isGeoLoading } = useCampaignGeoRestriction(
    campaign,
    customRestrictedCountries,
  );

  const handleOptIn = useCallback(async () => {
    try {
      const result = await optInToCampaign(campaign.id);
      if (result?.optedIn) {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.REWARDS_CAMPAIGN_OPT_IN_COMPLETED,
          )
            .addProperties({ campaign_id: campaign.id })
            .build(),
        );
        showToast(
          RewardsToastOptions.success(
            strings('rewards.campaign.opt_in_success_toast'),
          ),
        );
        onClose?.();
      }
    } catch {
      // Error is handled by the hook; sheet stays open so user can retry
    }
  }, [
    optInToCampaign,
    campaign.id,
    trackEvent,
    createEventBuilder,
    showToast,
    RewardsToastOptions,
    onClose,
  ]);

  return (
    <BottomSheet onClose={onClose}>
      <Box twClassName="px-4 pb-4">
        {/* Header: centered title + close button */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mb-6"
        >
          {/* Left spacer to balance the close button */}
          <Box twClassName="w-10" />
          <Box
            twClassName="flex-1 items-center"
            justifyContent={BoxJustifyContent.Center}
          >
            <Text
              variant={TextVariant.HeadingSm}
              fontWeight={FontWeight.Bold}
              testID="campaign-opt-in-sheet-title"
            >
              {strings('rewards.campaign.opt_in_sheet_title')}
            </Text>
          </Box>
          <ButtonIcon
            iconName={IconName.Close}
            iconProps={{ color: IconColor.IconDefault }}
            onPress={onClose}
            testID="campaign-opt-in-sheet-close"
          />
        </Box>

        {/* Legal disclaimer – rich text from Contentful */}
        {isDocument(campaign.termsAndConditions) && (
          <Box twClassName="mb-6">
            <ContentfulRichText
              document={campaign.termsAndConditions}
              textVariant={TextVariant.BodyMd}
              bodyClassName="text-center text-default"
              testID="campaign-opt-in-sheet-description"
            />
          </Box>
        )}

        {optInError && (
          <Box twClassName="mb-4">
            <RewardsErrorBanner
              title={strings('rewards.campaign_details.opt_in_error')}
              description={optInError}
              testID="campaign-opt-in-error-banner"
            />
          </Box>
        )}

        {isGeoRestricted && (
          <Box twClassName="mb-4">
            <RewardsInfoBanner
              title={strings('rewards.campaign.geo_restriction_banner_title')}
              description={strings(
                'rewards.campaign.geo_restriction_banner_description',
              )}
              testID="campaign-opt-in-geo-restriction-banner"
            />
          </Box>
        )}

        {/* Opt-in CTA */}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleOptIn}
          isLoading={isOptingIn}
          isDisabled={isOptingIn || isGeoLoading || isGeoRestricted}
          twClassName="w-full"
          testID="campaign-opt-in-cta"
        >
          {isGeoLoading
            ? strings('rewards.onboarding.intro_confirm_geo_loading')
            : strings('rewards.campaign.opt_in_cta')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default CampaignOptInSheet;
