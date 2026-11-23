import {
  TokenActionInput,
  useHandleOnBuy,
  useHandleOnReceive,
  useHandleOnSend,
} from './useTokenAtomicActions';
import type { TdpVersion } from '../analytics/getTdpAnalyticsBase';

/**
 * Composed hook for the Token Details Page Actions
 */
export const useTokenActions = ({
  token,
  networkName,
  tdpVersion,
}: {
  token: TokenActionInput;
  networkName?: string;
  /** Token Details page version (`'v2'` legacy, `'v3'` V1). When set, the below-chart Buy/Send/Receive buttons include `tdp_version` in their `ACTION_BUTTON_CLICKED` events. */
  tdpVersion?: TdpVersion;
}) => {
  const onBuy = useHandleOnBuy({ token, tdpVersion });
  const onSend = useHandleOnSend({ token, tdpVersion });
  const onReceive = useHandleOnReceive({ token, networkName, tdpVersion });

  return { onBuy, onSend, onReceive };
};

export default useTokenActions;
