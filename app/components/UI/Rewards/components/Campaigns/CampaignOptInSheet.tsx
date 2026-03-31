import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
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
} from '@metamask/design-system-react-native';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { useOptInToCampaign } from '../../hooks/useOptInToCampaign';
import useRewardsToast from '../../hooks/useRewardsToast';
import { strings } from '../../../../../../locales/i18n';
import { REWARDS_ONBOARD_TERMS_URL } from '../Onboarding/constants';
import RewardsErrorBanner from '../RewardsErrorBanner';
import RewardsInfoBanner from '../RewardsInfoBanner';
import { getDetectedGeolocation } from '../../../../../reducers/fiatOrders';
import { ONDO_RESTRICTED_COUNTRIES } from '../../../../../util/ondoGeoRestrictions';
import { selectGeolocationStatus } from '../../../../../selectors/geolocationController';
import ContentfulRichText, {
  isDocument,
} from '../ContentfulRichText/ContentfulRichText';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

interface CampaignOptInSheetProps {
  campaign: CampaignDto;
  onClose?: () => void;
}

/**
 * Bottom sheet shown when a user taps a campaign tile they haven't opted into yet.
 * Shows the campaign title, a legal disclaimer with a tappable terms link, and an opt-in CTA.
 */
const CampaignOptInSheet: React.FC<CampaignOptInSheetProps> = ({
  campaign,
  onClose,
}) => {
  const navigation = useNavigation();
  const { optInToCampaign, isOptingIn, optInError } = useOptInToCampaign();
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const geolocation = useSelector(getDetectedGeolocation);
  const geolocationStatus = useSelector(selectGeolocationStatus);

  const isGeoLoading =
    geolocationStatus === 'loading' || geolocationStatus === 'idle';

  const isGeoRestricted = useMemo(() => {
    if (__DEV__) return false;
    if (isGeoLoading) return false;
    const country = geolocation?.toUpperCase().split('-')[0];
    if (campaign.type === CampaignType.ONDO_HOLDING) {
      return !country || ONDO_RESTRICTED_COUNTRIES.has(country);
    }
    // Unknown country: can't confirm user is not in an excluded region, so block.
    // If the campaign has no exclusions this is a no-op.
    if (!country) return campaign.excludedRegions.length > 0;
    return campaign.excludedRegions.some(
      (region) => region.toUpperCase() === country,
    );
  }, [isGeoLoading, geolocation, campaign.type, campaign.excludedRegions]);

  const handleOptIn = useCallback(async () => {
    try {
      const result = await optInToCampaign(campaign.id);
      if (result?.optedIn) {
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
  }, [optInToCampaign, campaign.id, showToast, RewardsToastOptions, onClose]);

  const handleTermsPress = useCallback(() => {
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: REWARDS_ONBOARD_TERMS_URL,
        timestamp: Date.now(),
      },
    });
  }, [navigation]);

  return (
    <BottomSheet shouldNavigateBack={false} onClose={onClose}>
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
              variant={TextVariant.HeadingMd}
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

        {/* Legal disclaimer – rich text from Contentful or static fallback */}
        <Box twClassName="mb-6">
          {isDocument(campaign.termsAndConditions) ? (
            <ContentfulRichText
              document={campaign.termsAndConditions}
              textVariant={TextVariant.BodySm}
              bodyClassName="text-center text-alternative"
              testID="campaign-opt-in-sheet-description"
            />
          ) : (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-alternative text-center"
              testID="campaign-opt-in-sheet-description"
            >
              {strings('rewards.campaign.opt_in_sheet_description_pre_link')}{' '}
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-primary-default"
                onPress={handleTermsPress}
                testID="campaign-opt-in-sheet-terms-link"
              >
                {strings('rewards.campaign.opt_in_sheet_link_text')}
              </Text>
              {'. '}
              {strings('rewards.campaign.opt_in_sheet_description_post_link')}
            </Text>
          )}
        </Box>

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
