import type { Dispatch } from 'redux';
import { clearAttribution } from '../../core/redux/slices/attribution';

/**
 * Clears persisted acquisition attribution after Wallet Setup Completed
 * enrichment (or once the opt-in decision is recorded).
 */
export function clearAcquisitionStateAfterOptIn(dispatch: Dispatch): void {
  dispatch(clearAttribution());
}
