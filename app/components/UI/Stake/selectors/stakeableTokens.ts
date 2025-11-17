import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { TokenI } from '../../Tokens/types';
import { selectTrxStakingEnabled } from '../../../../selectors/featureFlagController/trxStakingEnabled';
import { isMainnetByChainId } from '../../../../util/networks';

/**
 * Returns true if the given asset should surface staking UI.
 * ETH native is always considered stakeable.
 * TRX native is considered stakeable only when the TRX staking flag is enabled.
 */
export const selectIsStakeableToken = createSelector(
  [(_state: RootState, asset: TokenI) => asset, selectTrxStakingEnabled],
  (asset, trxStakingEnabled) => {
    if (!asset) return false;

    // Only allow staking/earn for ETH on Ethereum mainnet
    if (asset.isETH) {
      return isMainnetByChainId(asset.chainId);
    }

    const isTronNative =
      asset.ticker === 'TRX' && asset.chainId?.startsWith('tron:');

    if (isTronNative && trxStakingEnabled) {
      return true;
    }

    return false;
  },
);
