import { useSelector } from 'react-redux';
import {
  selectRampsUnifiedBuyV2ActiveFlag,
  selectRampsUnifiedBuyV2MinimumVersionFlag,
} from '../../../../selectors/featureFlagController/ramps/rampsUnifiedBuyV2';
import { hasMinimumRequiredVersion } from '../utils/hasMinimumRequiredVersion';

export default function useRampsUnifiedV2Enabled() {
return true
  // const rampsUnifiedBuyV2MinimumVersionFlag = useSelector(
  //   selectRampsUnifiedBuyV2MinimumVersionFlag,
  // );
  // const rampsUnifiedBuyV2ActiveFlag = useSelector(
  //   selectRampsUnifiedBuyV2ActiveFlag,
  // );

  // const rampsUnifiedBuyV2BuildFlag =
  //   process.env.MM_RAMPS_UNIFIED_BUY_V2_ENABLED;

  // // if build flag is defined, it takes precedence over remote feature flag
  // if (
  //   rampsUnifiedBuyV2BuildFlag === 'true' ||
  //   rampsUnifiedBuyV2BuildFlag === 'false'
  // ) {
  //   return rampsUnifiedBuyV2BuildFlag === 'true';
  // }

  // const isRampsUnifiedV2Enabled = hasMinimumRequiredVersion(
  //   rampsUnifiedBuyV2MinimumVersionFlag,
  //   rampsUnifiedBuyV2ActiveFlag,
  // );

  // return isRampsUnifiedV2Enabled;
}
