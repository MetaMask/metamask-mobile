import React from 'react';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import VbaIllustration, {
  VbaIllustrationSource,
} from '../../../KYC/components/Illustration';
import VbaOnboardingError from '../../../KYC/components/OnboardingError';
import type { AccountCreateErrorVariant } from './accountCreateError';

export const VbaAccountCreateErrorSelectorsIDs = {
  CONTAINER: 'vba-account-create-error-container',
  BACK_BUTTON: 'vba-account-create-error-back-button',
  PRIMARY_BUTTON: 'vba-account-create-error-primary-button',
  SECONDARY_BUTTON: 'vba-account-create-error-secondary-button',
} as const;

interface VbaAccountCreateErrorProps {
  variant: AccountCreateErrorVariant;
  onPrimary: () => void | Promise<void>;
  onSecondary?: () => void | Promise<void>;
  onBack?: () => void;
}

const detailItems = () => [
  {
    id: 'account-number',
    icon: IconName.Card,
    title: strings(
      'virtual_bank_account.account_create_error.details.account_number_title',
    ),
    description: strings(
      'virtual_bank_account.account_create_error.details.account_number_description',
    ),
  },
  {
    id: 'routing',
    icon: IconName.Info,
    title: strings(
      'virtual_bank_account.account_create_error.details.routing_title',
    ),
    description: strings(
      'virtual_bank_account.account_create_error.details.routing_description',
    ),
  },
  {
    id: 'name',
    icon: IconName.UserCheck,
    title: strings(
      'virtual_bank_account.account_create_error.details.name_title',
    ),
    description: strings(
      'virtual_bank_account.account_create_error.details.name_description',
    ),
  },
];

/**
 * Account-creation failure. `blocked` cannot be fixed in the app, `details`
 * returns the user to their bank details, and `generic` can be retried.
 */
const VbaAccountCreateError = ({
  variant,
  onPrimary,
  onSecondary,
  onBack,
}: VbaAccountCreateErrorProps) => (
  <VbaOnboardingError
    testID={`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-${variant}`}
    backButtonTestID={VbaAccountCreateErrorSelectorsIDs.BACK_BUTTON}
    onBack={onBack}
    illustration={
      <VbaIllustration
        source={VbaIllustrationSource.hazard}
        twClassName="h-[65px] w-[71px]"
      />
    }
    title={strings(
      `virtual_bank_account.account_create_error.${variant}.title`,
    )}
    description={strings(
      `virtual_bank_account.account_create_error.${variant}.description`,
    )}
    items={variant === 'details' ? detailItems() : undefined}
    primaryAction={{
      label: strings(
        `virtual_bank_account.account_create_error.${variant}.primary`,
      ),
      onPress: onPrimary,
      testID: VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON,
    }}
    secondaryAction={
      onSecondary
        ? {
            label: strings(
              `virtual_bank_account.account_create_error.${variant}.secondary`,
            ),
            onPress: onSecondary,
            testID: VbaAccountCreateErrorSelectorsIDs.SECONDARY_BUTTON,
          }
        : undefined
    }
  />
);

export default VbaAccountCreateError;
