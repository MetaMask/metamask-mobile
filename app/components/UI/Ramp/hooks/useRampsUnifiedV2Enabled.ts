import { useSelector } from 'react-redux';
import { getVersion } from 'react-native-device-info';
import compareVersions from 'compare-versions';
import {
  selectRampsUnifiedBuyV1ActiveFlag,
  selectRampsUnifiedBuyV1MinimumVersionFlag,
} from '../../../../selectors/featureFlagController/ramps/rampsUnifiedBuyV1';

function hasMinimumRequiredVersion(
  minRequiredVersion: string | null | undefined,
  isUnifiedV1Enabled: boolean,
) {
  if (!minRequiredVersion) return false;
  const currentVersion = getVersion();
  return (
    isUnifiedV1Enabled &&
    compareVersions.compare(currentVersion, minRequiredVersion, '>=')
  );
}

export default function useRampsUnifiedV2Enabled() {
  const rampsUnifiedBuyV1MinimumVersionFlag = useSelector(
    selectRampsUnifiedBuyV1MinimumVersionFlag,
  );
  const rampsUnifiedBuyV1ActiveFlag = useSelector(
    selectRampsUnifiedBuyV1ActiveFlag,
  );

  const rampsUnifiedBuyV2BuildFlag =
    process.env.MM_RAMPS_UNIFIED_BUY_V2_ENABLED;

  if (
    rampsUnifiedBuyV2BuildFlag === 'true' ||
    rampsUnifiedBuyV2BuildFlag === 'false'
  ) {
    return rampsUnifiedBuyV2BuildFlag === 'true';
  }

  const isRampsUnifiedV1Enabled = hasMinimumRequiredVersion(
    rampsUnifiedBuyV1MinimumVersionFlag,
    rampsUnifiedBuyV1ActiveFlag,
  );

  return isRampsUnifiedV1Enabled;
}
