import { useSelector } from 'react-redux';
import { selectIsCardAuthenticated } from '../../../../../../selectors/cardController';
import { selectOnboardingId } from '../../../../../../core/redux/slices/card';
import { useCardSDK } from '../../../sdk';

/**
 * True when Card home should show the pending "Setting up your card" state
 * for someone who is still in onboarding and has no signed-in Card account.
 *
 * Signed-in users get the banner from their account data (`kyc_pending` or
 * the Immersve `kyc_under_review` view). Users still in onboarding have no
 * Card token until the You're verified screen, so that data never arrives
 * and Card home would otherwise show the ready-card layout. This covers them
 * when Card home was opened from the verification timeout or the pending KYC
 * notification (`fromKycPending` route param), or when the saved onboarding
 * session exists.
 *
 * A signed-out user stays on the waiting view until they sign in: a status
 * change to VERIFIED means onboarding can resume after login, not that the
 * card home is ready. Rejected and UNVERIFIED keep today's routing and leave
 * the pending flow.
 */
export const useSignedOutKycPending = (fromKycPending?: boolean): boolean => {
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const onboardingId = useSelector(selectOnboardingId);
  const { user } = useCardSDK();

  if (isAuthenticated) {
    return false;
  }

  // Rejected and unverified users keep today's routing (they leave the
  // pending flow), and a sticky `fromKycPending` route param must not keep
  // them on the waiting screen.
  const verificationState = user?.verificationState;
  if (verificationState === 'REJECTED' || verificationState === 'UNVERIFIED') {
    return false;
  }

  if (fromKycPending) {
    return true;
  }

  return Boolean(onboardingId);
};

export default useSignedOutKycPending;
