import { memo } from 'react';
import { Hex } from '@metamask/utils';
import { useArcDefaultTokens } from '../useArcDefaultTokens';

export interface AssetPollingProviderProps {
  chainIds?: Hex[];
  address?: Hex;
}

// AssetsController is now the sole source of truth for asset data and
// manages its own polling/refresh lifecycle internally, so this provider no
// longer needs to drive any of the legacy per-asset polling hooks. It is
// kept (with the same props) so call sites don't need to change, and still
// runs the Arc default-token bootstrap effect.
export const AssetPollingProvider = memo(
  (_props: AssetPollingProviderProps) => {
    useArcDefaultTokens();

    return null;
  },
);

AssetPollingProvider.displayName = 'AssetPollingProvider';
