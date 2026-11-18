import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { calcTokenValue } from '../../../../../util/transactions';
import type { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import type { PrepareRecurringDelegationQuery } from '../../api/recurringOrders.types';
import { getDelegatorAccountId } from '../../api/limitOrders/getDelegations/utils';
import type { BridgeToken } from '../../types';
import {
  parsePositiveInteger,
  type RecurringState,
} from '../recurringSchedule';

interface GetRecurringOrderDelegationParamsOptions {
  clientOrderId: string;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  sourceAmount?: string;
  recurring: RecurringState;
  getSelectedAccountByScope: ReturnType<
    typeof selectSelectedInternalAccountByScope
  >;
}

export function getRecurringOrderDelegationParams({
  clientOrderId,
  sourceToken,
  destToken,
  sourceAmount,
  recurring,
  getSelectedAccountByScope,
}: GetRecurringOrderDelegationParamsOptions): PrepareRecurringDelegationQuery {
  if (!sourceToken || !destToken || !sourceAmount) {
    throw new Error('Missing recurring order input');
  }

  const srcAssetId = formatAddressToAssetId(
    sourceToken.address,
    sourceToken.chainId,
  );
  const destAssetId = formatAddressToAssetId(
    destToken.address,
    destToken.chainId,
  );
  const every = parsePositiveInteger(recurring.everyValue);
  const repeatCount = parsePositiveInteger(recurring.repeatCount);

  if (
    !srcAssetId ||
    !destAssetId ||
    every === undefined ||
    repeatCount === undefined
  ) {
    throw new Error('Invalid recurring order input');
  }

  const accountAddress = getDelegatorAccountId(
    srcAssetId,
    getSelectedAccountByScope,
  );

  if (!accountAddress) {
    throw new Error('Missing recurring order account');
  }

  return {
    clientOrderId,
    accountAddress,
    srcAssetId,
    srcAmount: calcTokenValue(sourceAmount, sourceToken.decimals).toFixed(0),
    destAssetId,
    every,
    unit: recurring.everyUnit,
    repeatCount,
  };
}
