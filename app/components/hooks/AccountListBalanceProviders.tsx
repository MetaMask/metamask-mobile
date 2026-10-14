import React from 'react';
import { PerpsConnectionProvider } from '../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../UI/Perps/providers/PerpsStreamManager';
import { useABTest } from '../../hooks/useABTest';
import {
  HOMEPAGE_BALANCE_BREAKDOWN_AB_KEY,
  HOMEPAGE_BALANCE_BREAKDOWN_VARIANTS,
} from '../Views/Homepage/abTestConfig';
import { useAccountListBalance } from './useNonTokenBalance';
import { AccountListBalanceContext } from './AccountListBalanceContext';

interface AccountListBalanceProvidersProps {
  children: React.ReactNode;
}

const AccountListBalanceContent = ({
  children,
}: AccountListBalanceProvidersProps) => {
  const getAccountListBalance = useAccountListBalance();

  return (
    <AccountListBalanceContext.Provider value={getAccountListBalance}>
      {children}
    </AccountListBalanceContext.Provider>
  );
};

/**
 * Scopes account-list balance queries to account-menu surfaces while keeping
 * the generic selector list independent from those queries.
 */
const AccountListBalanceProviders = ({
  children,
}: AccountListBalanceProvidersProps) => {
  const {
    variant: balanceBreakdownVariant,
    isActive: isBalanceBreakdownExperimentActive,
  } = useABTest(
    HOMEPAGE_BALANCE_BREAKDOWN_AB_KEY,
    HOMEPAGE_BALANCE_BREAKDOWN_VARIANTS,
    { trackExposure: false },
  );
  const isBalanceBreakdownEnabled =
    isBalanceBreakdownExperimentActive &&
    balanceBreakdownVariant.showBalanceBreakdown;

  if (!isBalanceBreakdownEnabled) {
    return children;
  }

  return (
    <PerpsConnectionProvider suppressErrorView>
      <PerpsStreamProvider>
        <AccountListBalanceContent>{children}</AccountListBalanceContent>
      </PerpsStreamProvider>
    </PerpsConnectionProvider>
  );
};

export default AccountListBalanceProviders;
