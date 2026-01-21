import { useSelector } from 'react-redux';
import {
  selectRampsUnifiedBuyV1ActiveFlag,
  selectRampsUnifiedBuyV1MinimumVersionFlag,
} from '../../../../selectors/featureFlagController/ramps/rampsUnifiedBuyV1';
import { hasMinimumRequiredVersion } from '../utils/hasMinimumRequiredVersion';

export default function useRampsUnifiedV1Enabled() {
  // const rampsUnifiedBuyV1MinimumVersionFlag = useSelector(
  //   selectRampsUnifiedBuyV1MinimumVersionFlag,
  // );
  // const rampsUnifiedBuyV1ActiveFlag = useSelector(
  //   selectRampsUnifiedBuyV1ActiveFlag,
  // );

  // const rampsUnifiedBuyV1BuildFlag =
  //   process.env.MM_RAMPS_UNIFIED_BUY_V1_ENABLED;

  // // if build flag is defined, it takes precedence over remote feature flag
  // if (
  //   rampsUnifiedBuyV1BuildFlag === 'true' ||
  //   rampsUnifiedBuyV1BuildFlag === 'false'
  // ) {
  //   return rampsUnifiedBuyV1BuildFlag === 'true';
  // }

  // const isRampsUnifiedV1Enabled = hasMinimumRequiredVersion(
  //   rampsUnifiedBuyV1MinimumVersionFlag,
  //   rampsUnifiedBuyV1ActiveFlag,
  // );

  // return isRampsUnifiedV1Enabled;
  return true
}
