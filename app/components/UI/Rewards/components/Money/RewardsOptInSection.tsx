import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  ButtonSize,
  ButtonVariant,
  IconColor,
  IconName,
  SectionDivider,
  TabEmptyState,
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
  invitedOptInDescription: string;
  invitedOptInAction: string;
  invitedOptInLegal?: string;
}

export interface RewardsOptInSectionProps {
  localizedText: RewardsOptInCopy;
  showDivider?: boolean;
}

const RewardsOptInSection: React.FC<RewardsOptInSectionProps> = ({
  localizedText,
  showDivider = true,
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

  return (
    <Box testID={REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER}>
      {showDivider ? (
        <SectionDivider marginVertical={0} twClassName="mt-8 mb-8" />
      ) : null}
      <TabEmptyState
        icon={
          <AvatarIcon
            iconName={IconName.Gift}
            size={AvatarIconSize.Xl}
            severity={AvatarIconSeverity.Neutral}
            iconProps={{ color: IconColor.IconDefault }}
            testID={REWARDS_OPT_IN_SECTION_TEST_IDS.ICON}
          />
        }
        description={localizedText.invitedOptInDescription}
        descriptionProps={{
          variant: TextVariant.BodyMd,
          color: TextColor.TextAlternative,
        }}
        actionButtonText={localizedText.invitedOptInAction}
        actionButtonProps={{
          variant: ButtonVariant.Primary,
          size: ButtonSize.Lg,
          twClassName: 'mt-3 self-stretch',
          accessibilityLabel: localizedText.invitedOptInAction,
          isLoading: optinLoading || geoNotResolved,
          isDisabled: optinLoading || geoNotResolved || Boolean(disabledReason),
          testID: REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION,
        }}
        onAction={() => {
          if (!geoAllowsOptIn || disabledReason || optinLoading) {
            return;
          }
          void optin({ bulkLink: true });
        }}
        twClassName="mx-auto px-4"
      />
      {disabledReason || localizedText.invitedOptInLegal ? (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="px-4 pb-8 pt-6 text-center"
        >
          {disabledReason ?? localizedText.invitedOptInLegal}
        </Text>
      ) : null}
    </Box>
  );
};

export default RewardsOptInSection;
