import React from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { BaseAccountDetails } from '../BaseAccountDetails';
import RemoveAccount from '../../components/RemoveAccount';
import ExportCredentials from '../../components/ExportCredentials';
import SmartAccount from '../../components/SmartAccount';
import { useSelector } from 'react-redux';
import { selectSeedlessOnboardingLoginFlow } from '../../../../../../selectors/seedlessOnboardingController';

interface PrivateKeyAccountDetailsProps {
  account: InternalAccount;
}

export const PrivateKeyAccountDetails = ({
  account,
}: PrivateKeyAccountDetailsProps) => {
  // Seedless onboarding login flow does not support removing private key accounts for now
  const isSeedlessOnboardingLoginFlow = useSelector(
    selectSeedlessOnboardingLoginFlow,
  );

  return (
    <BaseAccountDetails account={account}>
      <ExportCredentials account={account} />
      <SmartAccount account={account} />
      {isSeedlessOnboardingLoginFlow ? null : (
        <RemoveAccount account={account} />
      )}
    </BaseAccountDetails>
  );
};
