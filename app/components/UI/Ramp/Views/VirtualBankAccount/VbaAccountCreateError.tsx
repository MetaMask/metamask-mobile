import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import VbaOnboardingError from '../../../KYC/components/OnboardingError';
import VbaAccountCreateFailure from '../../../KYC/components/assets/vba-account-create-failure.svg';
import type {
  AccountCreateErrorPrimaryAction,
  AccountCreateErrorVariant,
} from './accountCreateError';

export const VbaAccountCreateErrorSelectorsIDs = {
  CONTAINER: 'vba-account-create-error-container',
  BACK_BUTTON: 'vba-account-create-error-back-button',
  PRIMARY_BUTTON: 'vba-account-create-error-primary-button',
  SECONDARY_BUTTON: 'vba-account-create-error-secondary-button',
} as const;

interface VbaAccountCreateErrorProps {
  variant: AccountCreateErrorVariant;
  primaryActionType: AccountCreateErrorPrimaryAction;
  onPrimary: () => void | Promise<void>;
  onSecondary: () => void | Promise<void>;
  onBack?: () => void;
}

/**
 * Account-creation failure. The variant controls the title, while the action
 * controls whether the description directs the user to support or to retry.
 */
const VbaAccountCreateError = ({
  variant,
  primaryActionType,
  onPrimary,
  onSecondary,
  onBack,
}: VbaAccountCreateErrorProps) => (
  <VbaOnboardingError
    testID={`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-${variant}`}
    backButtonTestID={VbaAccountCreateErrorSelectorsIDs.BACK_BUTTON}
    onBack={onBack}
    illustration={<VbaAccountCreateFailure name="vba-account-create-failure" />}
    illustrationClassName="mb-5 w-full"
    title={strings(
      `virtual_bank_account.account_create_error.${variant}.title`,
    )}
    description={strings(
      primaryActionType === 'retry'
        ? 'virtual_bank_account.account_create_error.generic.description'
        : 'virtual_bank_account.account_create_error.details.description',
    )}
    primaryAction={{
      label: strings(
        primaryActionType === 'retry'
          ? 'virtual_bank_account.account_create_error.generic.primary'
          : 'virtual_bank_account.account_create_error.details.primary',
      ),
      onPress: onPrimary,
      testID: VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON,
    }}
    secondaryAction={{
      label: strings(
        `virtual_bank_account.account_create_error.${variant}.secondary`,
      ),
      onPress: onSecondary,
      testID: VbaAccountCreateErrorSelectorsIDs.SECONDARY_BUTTON,
    }}
  />
);

export default VbaAccountCreateError;
