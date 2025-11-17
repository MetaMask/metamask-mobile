import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { TokenI } from '../../Tokens/types';
import { selectTrxStakingEnabled } from '../../../../selectors/featureFlagController/trxStakingEnabled';
import {
  getDecimalChainId,
  isMainnetByChainId,
} from '../../../../util/networks';
import { INFURA_TESTNET_CHAIN_IDS } from '../../../../util/networks/customNetworks';

const HOODI_CHAIN_ID_DECIMAL = getDecimalChainId(
  INFURA_TESTNET_CHAIN_IDS.HOODI,
);
const HOODI_CHAIN_ID_HEX = INFURA_TESTNET_CHAIN_IDS.HOODI.toLowerCase();
const HOODI_CHAIN_ID_CAIP = `eip155:${HOODI_CHAIN_ID_DECIMAL}`;

const isHoodiChainId = (chainId?: string) => {
  if (typeof chainId !== 'string' || !chainId) {
    return false;
  }

  const normalizedChainId = chainId.toLowerCase();

  if (
    normalizedChainId === HOODI_CHAIN_ID_HEX ||
    normalizedChainId === HOODI_CHAIN_ID_CAIP
  ) {
    return true;
  }

  return getDecimalChainId(chainId) === HOODI_CHAIN_ID_DECIMAL;
};

/**
 * Returns true if the given asset should surface staking UI.
 * ETH native is always considered stakeable.
 * TRX native is considered stakeable only when the TRX staking flag is enabled.
 */
export const selectIsStakeableToken = createSelector(
  [(_state: RootState, asset: TokenI) => asset, selectTrxStakingEnabled],
  (asset, trxStakingEnabled) => {
    if (!asset) return false;

    // Only allow staking/earn for ETH on Ethereum mainnet or Hoodi testnet
    if (asset.isETH) {
      return isMainnetByChainId(asset.chainId) || isHoodiChainId(asset.chainId);
    }

    const isTronNative =
      asset.ticker === 'TRX' && asset.chainId?.startsWith('tron:');

    if (isTronNative && trxStakingEnabled) {
      return true;
    }

    return false;
  },
);
