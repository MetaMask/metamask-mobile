import React, { useCallback, useState } from 'react';
import ClaimResidencySheet from './ClaimResidencySheet';
import RewardsLocationSheet from './RewardsLocationSheet';
import TaxFormRequiredSheet from './TaxFormRequiredSheet';

type ClaimEligibilitySheet =
  | 'hidden'
  | 'residency'
  | 'usActivity'
  | 'externalProvider';

interface UseClaimEligibilityFlowResult {
  startClaimFlow: () => void;
  claimEligibilitySheets: React.ReactElement;
}

/**
 * Shared US / non-US claim gate used by the Claims tab and the Money card.
 * US persons and anyone with US activity are sent to the external tax
 * provider; everyone else can claim in-app.
 */
export const useClaimEligibilityFlow = (
  onEligibleClaim: () => void,
): UseClaimEligibilityFlowResult => {
  const [sheet, setSheet] = useState<ClaimEligibilitySheet>('hidden');

  const startClaimFlow = useCallback(() => {
    setSheet('residency');
  }, []);

  const handleClose = useCallback(() => {
    setSheet('hidden');
  }, []);

  const handleConfirmUs = useCallback(() => {
    setSheet('externalProvider');
  }, []);

  const handleConfirmNonUs = useCallback(() => {
    setSheet('usActivity');
  }, []);

  const handleConfirmUsActivity = useCallback(() => {
    setSheet('externalProvider');
  }, []);

  const handleConfirmNoUsActivity = useCallback(() => {
    setSheet('hidden');
    onEligibleClaim();
  }, [onEligibleClaim]);

  return {
    startClaimFlow,
    claimEligibilitySheets: (
      <>
        <ClaimResidencySheet
          isVisible={sheet === 'residency'}
          onClose={handleClose}
          onConfirmUs={handleConfirmUs}
          onConfirmNonUs={handleConfirmNonUs}
        />
        <RewardsLocationSheet
          isVisible={sheet === 'usActivity'}
          onClose={handleClose}
          onConfirmYes={handleConfirmUsActivity}
          onConfirmNo={handleConfirmNoUsActivity}
        />
        <TaxFormRequiredSheet
          isVisible={sheet === 'externalProvider'}
          onClose={handleClose}
        />
      </>
    ),
  };
};
