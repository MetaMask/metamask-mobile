import React, { useCallback, useState } from 'react';
import ClaimOnHoldSheet from './ClaimOnHoldSheet';
import ClaimResidencySheet from './ClaimResidencySheet';
import TaxFormPendingSheet from './TaxFormPendingSheet';
import TaxFormRequiredSheet from './TaxFormRequiredSheet';
import { markTaxFormPending, useIsTaxFormPending } from './rewardsClaimStore';

type ClaimEligibilitySheet =
  | 'hidden'
  | 'eligibility'
  | 'externalProvider'
  | 'pendingReview';

interface UseClaimEligibilityFlowResult {
  startClaimFlow: () => void;
  claimEligibilitySheets: React.ReactElement;
}

/**
 * Shared claim gate used by the Claims tab and the Money card. Anyone with a
 * US connection is sent to the external tax provider, and claiming again while
 * that form is under review reports pending review; everyone else claims
 * in-app.
 */
export const useClaimEligibilityFlow = (
  onEligibleClaim: () => void,
): UseClaimEligibilityFlowResult => {
  const [sheet, setSheet] = useState<ClaimEligibilitySheet>('hidden');
  const isTaxFormPending = useIsTaxFormPending();

  const startClaimFlow = useCallback(() => {
    setSheet(isTaxFormPending ? 'pendingReview' : 'eligibility');
  }, [isTaxFormPending]);

  const handleClose = useCallback(() => {
    setSheet('hidden');
  }, []);

  const handleConfirmYes = useCallback(() => {
    setSheet('externalProvider');
  }, []);

  const handleConfirmNo = useCallback(() => {
    setSheet('hidden');
    onEligibleClaim();
  }, [onEligibleClaim]);

  const handleContinueToProvider = useCallback(() => {
    markTaxFormPending();
    setSheet('hidden');
  }, []);

  return {
    startClaimFlow,
    claimEligibilitySheets: (
      <>
        <ClaimResidencySheet
          isVisible={sheet === 'eligibility'}
          onClose={handleClose}
          onConfirmUs={handleConfirmYes}
          onConfirmNonUs={handleConfirmNo}
        />
        <TaxFormRequiredSheet
          isVisible={sheet === 'externalProvider'}
          onClose={handleClose}
          onContinue={handleContinueToProvider}
        />
        <TaxFormPendingSheet
          isVisible={sheet === 'pendingReview'}
          onClose={handleClose}
        />
        {/* Kept for the flagged-user path; the live flow never opens it. */}
        <ClaimOnHoldSheet isVisible={false} onClose={handleClose} />
      </>
    ),
  };
};
