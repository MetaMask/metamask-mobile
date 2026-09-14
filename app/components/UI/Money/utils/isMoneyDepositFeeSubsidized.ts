import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  isSubsidizedRoute,
  type RelayFixedSpreadConfig,
} from '../../../Views/confirmations/utils/relayFixedSpread';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import { safeFormatChainIdToHex } from '../../Card/util/safeFormatChainIdToHex';

const MONAD_MUSD_TARGET = {
  address: MUSD_TOKEN_ADDRESS,
  chainId: CHAIN_IDS.MONAD,
};

const isMonadMusd = (address: string, chainId: string) =>
  chainId.toLowerCase() === MONAD_MUSD_TARGET.chainId.toLowerCase() &&
  address.toLowerCase() === MONAD_MUSD_TARGET.address.toLowerCase();

/**
 * Returns whether depositing an asset into the Money account incurs no Relay
 * fee. Money deposits always target Monad mUSD, so a source-only route match
 * is insufficient.
 */
export const isMoneyDepositFeeSubsidized = (
  relayFixedSpread: RelayFixedSpreadConfig,
  token: { address: string; chainId?: string },
): boolean => {
  if (!token.chainId) return false;

  const chainId = safeFormatChainIdToHex(token.chainId);

  return (
    isMonadMusd(token.address, chainId) ||
    isSubsidizedRoute(
      relayFixedSpread,
      { address: token.address, chainId },
      MONAD_MUSD_TARGET,
    )
  );
};
