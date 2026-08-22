import { useSelector } from 'react-redux';

import { selectOffRampNonEvmEnabled } from '../../../../../selectors/featureFlagController/ramps/offRampNonEvm';

/**
 * Whether the non-EVM (e.g. Solana) off-ramp sell flow is enabled.
 * When false, off-ramp behaves exactly as before (EVM-only).
 */
export default function useOffRampNonEvmEnabled(): boolean {
  return useSelector(selectOffRampNonEvmEnabled);
}
