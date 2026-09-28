import { useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import type { Caip19AssetId } from '@metamask/assets-controller';
import { BridgeClientId, getClientHeaders } from '@metamask/bridge-controller';
import { BRIDGE_API_BASE_URL } from '../../../../../../constants/bridge';
import Engine from '../../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { getBaseSemVerVersion } from '../../../../../../util/version';
import { parseLimitOrderDelegationsResponse } from './validators';
import type { LimitOrderDelegationsResponse } from './schema';
import { getDelegatorAccountId } from './utils';
import { useMemo } from 'react';

export interface LimitOrderDelegationsParams {
  sourceAssetId: Caip19AssetId;
  sourceAmount: string;
  destAssetId: Caip19AssetId;
  destAmount: string;
  /**
   * How far below `destAmount` the user will still accept, expressed as a
   * percent string (e.g. `'2'` for 2%).
   */
  costTolerance: string;
  expiresInMinutes: number;
}

interface FetchLimitOrdersDelegationsParams
  extends LimitOrderDelegationsParams {
  /**
   * CAIP-10 account address of the delegator.
   */
  accountAddress: string;
  clientOrderId: string;
}

const fetchLimitOrdersDelegations = async ({
  accountAddress,
  clientOrderId,
  sourceAssetId,
  sourceAmount,
  destAssetId,
  destAmount,
  costTolerance,
  expiresInMinutes,
}: FetchLimitOrdersDelegationsParams): Promise<LimitOrderDelegationsResponse> => {
  const bearerToken =
    await Engine.context.AuthenticationController.getBearerToken();

  const searchParams = new URLSearchParams({
    clientOrderId,
    accountAddress,
    srcAssetId: sourceAssetId,
    srcAmount: sourceAmount,
    destAssetId,
    destAmount,
    priceTolerance: costTolerance,
    expiresInMinutes: String(expiresInMinutes),
  });

  const response = await fetch(
    `${BRIDGE_API_BASE_URL}/v2/orders/limit/delegations?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getClientHeaders({
          clientId: BridgeClientId.MOBILE,
          clientVersion: getBaseSemVerVersion(),
          jwt: bearerToken ?? '',
        }),
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `fetchLimitOrdersDelegations: Request failed with status ${response.status}`,
    );
  }

  return parseLimitOrderDelegationsResponse(await response.json());
};

export const useFetchLimitOrdersDelegations = (
  params: LimitOrderDelegationsParams,
) => {
  const getSelectedAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  // Keep the client order id stable for as long as the order params are the same.
  const clientOrderId = useMemo(
    () => uuidv4(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      params.sourceAssetId,
      params.sourceAmount,
      params.destAssetId,
      params.destAmount,
      params.costTolerance,
      params.expiresInMinutes,
    ],
  );

  return {
    fetchLimitOrdersDelegations: async () => {
      const accountAddress = getDelegatorAccountId(
        params.sourceAssetId,
        getSelectedAccountByScope,
      );

      if (!accountAddress) {
        throw new Error(
          'useLimitOrdersDelegationsMutation: Missing delegator account',
        );
      }

      return fetchLimitOrdersDelegations({
        ...params,
        accountAddress,
        clientOrderId,
      });
    },
  };
};
