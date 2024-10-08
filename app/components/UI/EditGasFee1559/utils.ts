import { MetaMetricsEvents } from '../../../core/Analytics';
import { getDecimalChainId } from '../../../util/networks';
import { trackEvent } from '../Ramp/hooks/useAnalytics';

export const getAnalyticsParams = ({
  analyticsParams,
  chainId,
  view,
  selectedOption,
}: {
  analyticsParams: {
    chain_id: string;
    gas_estimate_type: string;
    gas_mode: string;
    speed_set: string;
    view: string;
  };
  chainId: string;
  view: string;
  selectedOption: string;
}) => {
  try {
    return {
      ...analyticsParams,
      chain_id: getDecimalChainId(chainId),
      function_type: view,
      gas_mode: selectedOption ? 'Basic' : 'Advanced',
      speed_set: selectedOption || undefined,
    };
  } catch (error) {
    return {};
  }
};
