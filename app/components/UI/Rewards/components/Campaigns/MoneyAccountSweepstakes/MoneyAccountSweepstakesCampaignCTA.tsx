import React, { useCallback, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import type {
  CampaignDto,
  MoneyAccountSweepstakesLocalizedTextDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../../constants/navigation/Routes';
import useCampaignGeoRestriction from '../../../hooks/useCampaignGeoRestriction';
import { useHasActionableAddMoneyOptions } from '../../../hooks/useHasActionableAddMoneyOptions';
import { useMoneyAccountSweepstakesBinding } from '../../../hooks/useMoneyAccountSweepstakesBinding';
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
  inline?: boolean;
}

const MoneyAccountSweepstakesCampaignCTA: React.FC<
  MoneyAccountSweepstakesCampaignCTAProps
> = ({ campaign, seriesStatus, localizedText, inline = false }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const [isOptInSheetOpen, setIsOptInSheetOpen] = useState(false);
  // Toast after Add Money closes — Rewards toast sits under native modals.
  const pendingNoFundingToastRef = useRef(false);
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const { isGeoRestricted, isGeoLoading } = useCampaignGeoRestriction(campaign);
  const { optedInAny, isLoading: isParticipationLoading } =
    useMoneyAccountSweepstakesParticipation(seriesStatus === 'active');
  const { ensureOptedIn } = useMoneyAccountSweepstakesOptIn();
  const { ensureBound, bindingConflict } = useMoneyAccountSweepstakesBinding();
  const hasActionableAddMoneyOptions = useHasActionableAddMoneyOptions();
  const buttonLabel = optedInAny
    ? localizedText.addFundsTitle
    : localizedText.joinTheSweepstakesTitle;
  const optInSheetTitle = localizedText.joinTheSweepstakesTitle;

  const showBindingConflictToast = useCallback(() => {
    showToast(
      RewardsToastOptions.entriesClosed(
        localizedText.bindingConflictTitle,
        localizedText.bindingConflictDescription,
      ),
    );
  }, [
    showToast,
    RewardsToastOptions,
    localizedText.bindingConflictTitle,
    localizedText.bindingConflictDescription,
  ]);

  const showNoFundingOptionsToast = useCallback(() => {
    showToast(
      RewardsToastOptions.entriesClosed(
        localizedText.addFundsNoBalanceTitle,
        localizedText.addFundsNoBalanceDescription,
      ),
    );
  }, [
    showToast,
    RewardsToastOptions,
    localizedText.addFundsNoBalanceTitle,
    localizedText.addFundsNoBalanceDescription,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!pendingNoFundingToastRef.current) {
        return;
      }
      pendingNoFundingToastRef.current = false;
      showNoFundingOptionsToast();
    }, [showNoFundingOptionsToast]),
  );

  const navigateToAddMoney = useCallback(() => {
    if (!hasActionableAddMoneyOptions) {
      pendingNoFundingToastRef.current = true;
    }
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  }, [hasActionableAddMoneyOptions, navigation]);

  const handleGeoLockedPress = useCallback(() => {
    showToast(
      RewardsToastOptions.entriesClosed(
        strings('rewards.campaign.geo_locked_toast_title'),
        strings('rewards.campaign.geo_locked_toast_description'),
      ),
    );
  }, [showToast, RewardsToastOptions]);

  const handleCustomOptIn = useCallback(async (): Promise<boolean> => {
    const result = await ensureOptedIn();
    if (result.reason === 'binding-conflict') {
      showBindingConflictToast();
      return false;
    }
    return result.success;
  }, [ensureOptedIn, showBindingConflictToast]);

  const handleOptInSheetClose = useCallback(() => {
    setIsOptInSheetOpen(false);
  }, []);

  const navigateToOfficialRules = useCallback(() => {
    setIsOptInSheetOpen(false);
    navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
      campaignId: campaign.id,
    });
  }, [campaign.id, navigation]);

  const handlePress = useCallback(async () => {
    if (isGeoLoading) {
      return;
    }
    if (isGeoRestricted) {
      handleGeoLockedPress();
      return;
    }
    if (optedInAny) {
      if (bindingConflict) {
        showBindingConflictToast();
        return;
      }
      const bindingResult = await ensureBound();
      if (bindingResult === 'conflict') {
        showBindingConflictToast();
        return;
      }
      navigateToAddMoney();
      return;
    }
    setIsOptInSheetOpen(true);
  }, [
    isGeoLoading,
    isGeoRestricted,
    handleGeoLockedPress,
    optedInAny,
    bindingConflict,
    ensureBound,
    showBindingConflictToast,
    navigateToAddMoney,
  ]);

  if (seriesStatus !== 'active') {
    return null;
  }

  return (
    <>
      <Box twClassName={inline ? 'pt-1' : 'mb-2 gap-2 px-4 pb-2 pt-4'}>
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
          legalTextVariant={TextVariant.BodyXs}
          legalBodyClassName="text-left text-alternative"
          onLegalLinkPress={navigateToOfficialRules}
          onOptIn={handleCustomOptIn}
          onClose={handleOptInSheetClose}
        />
      )}
    </>
  );
};

export default MoneyAccountSweepstakesCampaignCTA;
