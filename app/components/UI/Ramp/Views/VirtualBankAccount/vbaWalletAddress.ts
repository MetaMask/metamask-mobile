import Engine from '../../../../../core/Engine';
import type { RootState } from '../../../../../reducers';
import { selectSelectedVbaWalletAddress } from '../../../../../selectors/rampsController';

/**
 * Reads the VBA wallet from live controller state. Redux receives controller
 * changes in batches, so right after a cold-start unlock it can still hold the
 * locked keyring and report no wallet.
 */
export const getVbaWalletAddress = (): string | null =>
  selectSelectedVbaWalletAddress({
    engine: { backgroundState: Engine.state },
  } as RootState);
