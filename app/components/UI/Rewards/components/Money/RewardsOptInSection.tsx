import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  AvatarIcon,
  AvatarIconSize,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Card,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Engine from '../../../../../core/Engine';
import { selectOptinAllowedForGeo } from '../../../../../reducers/rewards/selectors';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { isHardwareAccount } from '../../../../../util/address';
import { strings } from '../../../../../../locales/i18n';
import useOptin from '../../hooks/useOptIn';
import useRewardsToast from '../../hooks/useRewardsToast';

export const REWARDS_OPT_IN_SECTION_TEST_IDS = {
  CONTAINER: 'rewards-opt-in-section',
  ICON: 'rewards-opt-in-section-icon',
  ACTION: 'rewards-opt-in-section-action',
} as const;

export interface RewardsOptInCopy {
  invitedOptInDescription?: string;
  invitedOptInAction?: string;
  invitedOptInLegal?: string;
}

export interface RewardsOptInSectionProps {
  localizedText: RewardsOptInCopy;
}

/**
 * Card that opts the user in to Rewards campaigns and benefits. Shown in
 * place of that content until they opt in.
 */
const RewardsOptInSection: React.FC<RewardsOptInSectionProps> = ({
  localizedText,
}) => {
  const accountGroupAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );
  const optinAllowedForGeo = useSelector(selectOptinAllowedForGeo);
  const { optin, optinError, optinLoading, clearOptinError } = useOptin();
  const { showToast, RewardsToastOptions } = useRewardsToast();

  const accountRefusalReason = useMemo(() => {
    if (
      accountGroupAccounts.some((account) =>
        isHardwareAccount(account?.address),
      )
    ) {
      return strings(
        'rewards.onboarding.not_supported_hardware_account_description',
      );
    }

    const hasAnySupportedAccount = accountGroupAccounts.some((account) => {
      try {
        return Engine.controllerMessenger.call(
          'RewardsController:isOptInSupported',
          account,
        );
      } catch {
        return false;
      }
    });

    return hasAnySupportedAccount
      ? null
      : strings('rewards.onboarding.not_supported_account_type_description');
  }, [accountGroupAccounts]);

  let disabledReason: string | null = null;
  if (optinAllowedForGeo === false) {
    disabledReason = strings(
      'rewards.onboarding.not_supported_region_description',
    );
  } else if (accountRefusalReason) {
    disabledReason = accountRefusalReason;
  }

  // Null means there is no known location yet. Hold the CTA for that gap. A
  // known location stays in force during a refresh and after a failed refresh.
  // Error or UNKNOWN with no usable location is allowed.
  const geoNotResolved = optinAllowedForGeo === null && !accountRefusalReason;
  const geoAllowsOptIn = optinAllowedForGeo === true;

  useEffect(() => {
    if (!optinError) {
      return;
    }
    showToast(
      RewardsToastOptions.error(
        strings('rewards.optin_error.title'),
        strings('rewards.optin_error.description'),
      ),
    );
    clearOptinError();
  }, [optinError, showToast, RewardsToastOptions, clearOptinError]);

  const description =
    localizedText.invitedOptInDescription ??
    strings('rewards.campaign.opt_in_descrption');
  const actionLabel =
    localizedText.invitedOptInAction ?? strings('rewards.campaign.opt_in_cta');
  const footnote =
    disabledReason ??
    localizedText.invitedOptInLegal ??
    strings('rewards.campaign.opt_in_section_legal');

  return (
    <Card
      twClassName="mx-4 items-center gap-4 py-6"
      testID={REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER}
    >
      <Box twClassName="items-center gap-3">
        {/* The avatar takes the card's own surface, so only the star shows. */}
        <AvatarIcon
          iconName={IconName.Star}
          size={AvatarIconSize.Md}
          twClassName="bg-section"
          accessibilityElementsHidden
          importantForAccessibility="no"
          testID={REWARDS_OPT_IN_SECTION_TEST_IDS.ICON}
        />
        <Box twClassName="gap-1">
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-center"
            accessibilityRole="header"
          >
            {strings('rewards.campaign.opt_in_section_title')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {description}
          </Text>
        </Box>
      </Box>
      {/* Same width as the action in the Rewards tab empty states. */}
      <Box twClassName="w-full max-w-64">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={optinLoading || geoNotResolved}
          isDisabled={optinLoading || geoNotResolved || Boolean(disabledReason)}
          accessibilityLabel={actionLabel}
          onPress={() => {
            if (!geoAllowsOptIn || disabledReason || optinLoading) {
              return;
            }
            void optin({ bulkLink: true });
          }}
          testID={REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION}
        >
          {actionLabel}
        </Button>
      </Box>
      {footnote ? (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {footnote}
        </Text>
      ) : null}
    </Card>
  );
};

export default RewardsOptInSection;
