import { useQuery } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';

interface UsePredictBalanceOptions {
  providerId?: string;
  enabled?: boolean;
}

export function usePredictBalance(options?: UsePredictBalanceOptions) {
  const { providerId = POLYMARKET_PROVIDER_ID, enabled = true } = options ?? {};

  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();

  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const address = evmAccount?.address ?? '0x0';

  return useQuery({
    ...predictQueries.balance.options({ address, providerId }),
    queryFn: async () => {
      try {
        await ensurePolygonNetworkExists();
      } catch {
        // Network might already exist — continue with balance fetch
      }

      const balance = await Engine.context.PredictController.getBalance({
        address,
        providerId,
      });

      DevLogger.log('usePredictBalance: Loaded balance', {
        balance,
        providerId,
      });

      return balance;
    },
    enabled,
  });
}
