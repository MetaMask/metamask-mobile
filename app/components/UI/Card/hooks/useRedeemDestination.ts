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
  isMoneyAccountPriorityEntry,
  networkToCaipChainId,
  resolveReceivingPriorityEntry,
} from '../util/redeemDestination';

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
  const redeemsToMoneyAccount =
    !isResidencyBlocked && Boolean(primaryMoneyAccount);

  const params = useMemo(
    () => ({ caipChainId, symbol }),
    [caipChainId, symbol],
  );
  const delegationToken = useSelector((state: RootState) =>
    selectCardDelegationToken(state, params),
  );

  return useMemo(() => {
    const isResolved = Boolean(caipChainId && symbol);

    const receivingEntry = resolveReceivingPriorityEntry(
      externalWalletPriority,
      network,
    );
    const receivingAddress = receivingEntry?.address;

    const isMoneyAccountDestination = receivingEntry
      ? isMoneyAccountPriorityEntry(receivingEntry, vedaConfig)
      : redeemsToMoneyAccount && Boolean(delegationToken?.isMoneyAccountEntry);

    const hasFunding = hasApprovedFundingFor(
      fundingTokens,
      caipChainId,
      symbol,
    );
    const hasApprovedDestination = isMoneyAccountDestination
      ? isAnyMoneyAccountDelegated
      : hasFunding || isAnyMoneyAccountDelegated;

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
    redeemsToMoneyAccount,
  ]);
};

export default useRedeemDestination;
