import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../../core/Engine';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import FundingSheet from '../../components/FundingSheet';
import { useCollectorCryptAccount } from '../../providers/collector-crypt/hooks/useCollectorCryptAccount';
import { useUsdcBalance } from '../../providers/collector-crypt/hooks/useUsdcBalance';
import GachaOnboarding from './GachaOnboarding';

/** Funding stays above onboarding. Only OK completes it and unlocks the pack routes. */
const GachaOnboardingScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const account = useCollectorCryptAccount();
  const balance = useUsdcBalance();
  const accountKey = account ? `${account.id}:${account.address}` : undefined;
  const [funding, setFunding] = useState({ accountKey, isOpen: false });
  // Discard the old account's opening, including when it is selected again.
  // Adjusting our own state here preserves the onboarding step without an effect.
  if (funding.accountKey !== accountKey) {
    setFunding({ accountKey, isOpen: false });
  }
  const isFundingOpen = funding.accountKey === accountKey && funding.isOpen;

  const closeFunding = useCallback(() => {
    setFunding((current) => ({ ...current, isOpen: false }));
  }, []);
  const complete = useCallback(() => {
    Engine.context.GachaController.completeOnboarding();
  }, []);

  return (
    <>
      <GachaOnboarding
        balance={balance.baseUnits}
        onFund={() => setFunding({ accountKey, isOpen: true })}
        onComplete={complete}
        onClose={() => navigation.goBack()}
        isFunding={!account || isFundingOpen}
      />
      {isFundingOpen && (
        <FundingSheet
          onClose={closeFunding}
          options={{
            destinationAddress: account?.address,
            onTradeStateChange: (event) => {
              if (event.status === 'complete') {
                void balance.refresh();
              }
            },
          }}
        />
      )}
    </>
  );
};

export default GachaOnboardingScreen;
