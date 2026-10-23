import { useCallback, useEffect, useRef, useState } from 'react';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { ensureError } from '../../../../util/errorUtils';
import type {
  ChompSignalResult,
  MoneyAccountChompSignals,
} from '../utils/moneyAccountRegistrationStatus';

const toSignalResult = <Response, Data>(
  settled: PromiseSettledResult<Response>,
  transform: (response: Response) => Data,
): ChompSignalResult<Data> =>
  settled.status === 'fulfilled'
    ? { status: 'success', data: transform(settled.value) }
    : { status: 'error', error: ensureError(settled.reason) };

const fetchChompSignals = async (
  address: Hex,
): Promise<MoneyAccountChompSignals> => {
  const lowercasedAddress = address.toLowerCase();
  const [associatedAddresses, upgrades, intents] = await Promise.allSettled([
    Engine.controllerMessenger.call('ChompApiService:getAssociatedAddresses'),
    Engine.controllerMessenger.call('ChompApiService:getUpgrades', address),
    Engine.controllerMessenger.call(
      'ChompApiService:getIntentsByAddress',
      address,
    ),
  ]);

  return {
    isAddressAssociated: toSignalResult(associatedAddresses, (entries) =>
      entries.some((entry) => entry.address === lowercasedAddress),
    ),
    upgrades: toSignalResult(upgrades, (entries) => entries),
    intents: toSignalResult(intents, (entries) => entries),
  };
};

const useMoneyAccountChompStatus = (address: Hex | undefined) => {
  const [signals, setSignals] = useState<MoneyAccountChompSignals>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const latestRequestIdRef = useRef(0);

  const load = useCallback(
    async ({ invalidate }: { invalidate: boolean }) => {
      if (!address) {
        return;
      }
      const requestId = ++latestRequestIdRef.current;
      if (invalidate) {
        await Engine.controllerMessenger.call(
          'ChompApiService:invalidateQueries',
        );
      }
      const result = await fetchChompSignals(address);
      if (requestId === latestRequestIdRef.current) {
        setSignals(result);
      }
    },
    [address],
  );

  useEffect(() => {
    load({ invalidate: false });
    return () => {
      latestRequestIdRef.current += 1;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load({ invalidate: true });
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  return { signals, isRefreshing, refresh };
};

export default useMoneyAccountChompStatus;
