import { memo } from 'react';
import { Hex } from '@metamask/utils';

export interface AssetPollingProviderProps {
  chainIds?: Hex[];
  address?: Hex;
}

// AssetsController is now the sole source of truth for asset data and
// manages its own polling/refresh lifecycle internally, so this provider no
// longer needs to drive any legacy per-asset polling hooks. It is kept (with
// the same props) so call sites don't need to change.
export const AssetPollingProvider = memo(
  (_props: AssetPollingProviderProps) => null,
);

AssetPollingProvider.displayName = 'AssetPollingProvider';
