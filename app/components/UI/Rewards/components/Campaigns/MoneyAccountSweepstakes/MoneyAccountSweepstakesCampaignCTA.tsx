import React, { useCallback, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import type {
  CampaignDto,
  MoneyAccountSweepstakesLocalizedTextDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../../constants/navigation/Routes';
import useCampaignGeoRestriction from '../../../hooks/useCampaignGeoRestriction';
import { useMoneyAccountSweepstakesOptIn } from '../../../hooks/useMoneyAccountSweepstakesOptIn';
import { useMoneyAccountSweepstakesParticipation } from '../../../hooks/useMoneyAccountSweepstakesParticipation';
import useRewardsToast from '../../../hooks/useRewardsToast';
import type { MoneyAccountSweepstakesSeriesStatus } from '../../../utils/moneyAccountSweepstakesSeries';
import { strings } from '../../../../../../../locales/i18n';
import CampaignOptInSheet from '../CampaignOptInSheet';
import { CAMPAIGN_CTA_TEST_IDS } from '../CampaignOptInCta';

interface MoneyAccountSweepstakesCampaignCTAProps {
  campaign: CampaignDto;
  seriesStatus: MoneyAccountSweepstakesSeriesStatus | null;
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
}

const MoneyAccountSweepstakesCampaignCTA: React.FC<
  MoneyAccountSweepstakesCampaignCTAProps
> = ({ campaign, seriesStatus, localizedText }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const [isOptInSheetOpen, setIsOptInSheetOpen] = useState(false);
  const shouldNavigateToAddMoneyRef = useRef(false);
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const { isGeoRestricted, isGeoLoading } = useCampaignGeoRestriction(campaign);
  const { optedInAny, isLoading: isParticipationLoading } =
    useMoneyAccountSweepstakesParticipation(seriesStatus === 'active');
  const { ensureOptedIn } = useMoneyAccountSweepstakesOptIn();

  const buttonLabel = localizedText.addFundsTitle;
  const optInSheetTitle = localizedText.joinTheSweepstakesTitle;

  const navigateToAddMoney = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  }, [navigation]);

  const handleGeoLockedPress = useCallback(() => {
    showToast(
      RewardsToastOptions.entriesClosed(
        strings('rewards.campaign.geo_locked_toast_title'),
        strings('rewards.campaign.geo_locked_toast_description'),
      ),
    );
  }, [showToast, RewardsToastOptions]);

  const handleCustomOptIn = useCallback(async (): Promise<boolean> => {
    const success = await ensureOptedIn();
    shouldNavigateToAddMoneyRef.current = success;
    return success;
  }, [ensureOptedIn]);

  const handleOptInSheetClose = useCallback(() => {
    setIsOptInSheetOpen(false);
    if (shouldNavigateToAddMoneyRef.current) {
      shouldNavigateToAddMoneyRef.current = false;
      navigateToAddMoney();
    }
  }, [navigateToAddMoney]);

  const handlePress = useCallback(() => {
    if (isGeoLoading) {
      return;
    }
    if (optedInAny) {
      navigateToAddMoney();
      return;
    }
    shouldNavigateToAddMoneyRef.current = false;
    setIsOptInSheetOpen(true);
  }, [isGeoLoading, optedInAny, navigateToAddMoney]);

  if (seriesStatus !== 'active') {
    return null;
  }

  if (!isGeoLoading && isGeoRestricted) {
    return (
      <Box twClassName="p-4 mb-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          startIconName={IconName.Lock}
          onPress={handleGeoLockedPress}
          testID={CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON}
        >
          {strings('rewards.campaign.geo_locked_cta')}
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Box twClassName="p-4 mb-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isGeoLoading || isParticipationLoading}
          loadingText={strings('rewards.campaign.geo_loading')}
          onPress={handlePress}
          testID={CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON}
        >
          {buttonLabel}
        </Button>
      </Box>

      {isOptInSheetOpen && (
        <CampaignOptInSheet
          campaign={campaign}
          title={optInSheetTitle}
          onOptIn={handleCustomOptIn}
          onClose={handleOptInSheetClose}
        />
      )}
    </>
  );
};

export default MoneyAccountSweepstakesCampaignCTA;
