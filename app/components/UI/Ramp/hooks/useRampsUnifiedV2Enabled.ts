import { useSelector } from 'react-redux';
import { selectRampsUnifiedBuyV2Enabled } from '../../../../selectors/featureFlagController/ramps/rampsUnifiedBuyV2';

export default function useRampsUnifiedV2Enabled() {
  const isEnabled = useSelector(selectRampsUnifiedBuyV2Enabled);

  const buildFlag = process.env.MM_RAMPS_UNIFIED_BUY_V2_ENABLED;
  if (buildFlag === 'true' || buildFlag === 'false') {
    return buildFlag === 'true';
  }

  return isEnabled;
}
