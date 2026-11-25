import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import {
  selectCardDelegationToken,
  selectCardExternalWalletPriority,
  selectCardFundingTokens,
  selectIsCardResidencyBlocked,
  selectIsAnyMoneyAccountDelegatedForCard,
  selectMoneyAccountVedaTokenConfig,
} from '../../../../selectors/cardController';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import type { RootState } from '../../../../reducers';
import type { CardFundingToken } from '../types';
import {
  hasApprovedFundingFor,
  networkToCaipChainId,
  resolveRedeemReceivingEntry,
} from '../util/redeemDestination';
import { MONEY_ACCOUNT_DELEGATION_NETWORK } from '../util/vedaToken';

interface RedeemDestination {
  caipChainId: CaipChainId | undefined;
  symbol: string | undefined;
  isResolved: boolean;
  isMoneyAccountDestination: boolean;
  hasApprovedDestination: boolean;
  delegationToken: CardFundingToken | null;
  receivingAddress: string | undefined;
}

const useRedeemDestination = ({
  currency,
  network,
}: {
  currency?: string;
  network?: string;
}): RedeemDestination => {
  const caipChainId = networkToCaipChainId(network);
  const symbol = currency || undefined;

  const fundingTokens = useSelector(selectCardFundingTokens);
  const externalWalletPriority = useSelector(selectCardExternalWalletPriority);
  const vedaConfig = useSelector(selectMoneyAccountVedaTokenConfig);
  const isAnyMoneyAccountDelegated = useSelector(
    selectIsAnyMoneyAccountDelegatedForCard,
  );
  const isResidencyBlocked = useSelector(selectIsCardResidencyBlocked);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);

  const params = useMemo(
    () => ({ caipChainId, symbol }),
    [caipChainId, symbol],
  );
  const delegationToken = useSelector((state: RootState) =>
    selectCardDelegationToken(state, params),
  );

  return useMemo(() => {
    const isMonadRedeem = network === MONEY_ACCOUNT_DELEGATION_NETWORK;
    // Monad redemptions can only land in the Money Account vault, and residents
    // of blocked regions have no Money Account, so Monad is not withdrawable
    // for them even when the estimation names it.
    const isUnavailableNetwork = isMonadRedeem && isResidencyBlocked;

    const isMoneyAccountDestination = isMonadRedeem && !isUnavailableNetwork;

    const receivingEntry = isUnavailableNetwork
      ? undefined
      : resolveRedeemReceivingEntry({
          priorities: externalWalletPriority,
          network,
          vedaConfig,
        });
    const receivingAddress = isMoneyAccountDestination
      ? (receivingEntry?.address ?? primaryMoneyAccount?.address)
      : receivingEntry?.address;

    // Resolved means the estimation named a supported, withdrawable
    // network+currency. Residency-blocked Monad is not withdrawable, so keep
    // isResolved false — otherwise needsSetup shows a Linea funding banner
    // that can never produce a Monad receiving address.
    const isResolved = Boolean(caipChainId && symbol) && !isUnavailableNetwork;

    const hasFunding = hasApprovedFundingFor(
      fundingTokens,
      caipChainId,
      symbol,
    );
    const hasApprovedDestination =
      Boolean(receivingAddress) &&
      (isMoneyAccountDestination
        ? isAnyMoneyAccountDelegated
        : hasFunding || isAnyMoneyAccountDelegated);

    return {
      caipChainId,
      symbol,
      isResolved,
      isMoneyAccountDestination,
      hasApprovedDestination,
      delegationToken,
      receivingAddress,
    };
  }, [
    caipChainId,
    symbol,
    network,
    delegationToken,
    fundingTokens,
    externalWalletPriority,
    vedaConfig,
    isAnyMoneyAccountDelegated,
    isResidencyBlocked,
    primaryMoneyAccount,
  ]);
};

export default useRedeemDestination;
