import { MMM_ORIGIN, MM_MOBILE_ORIGIN } from '../constants/confirmations';

function isDappOrigin(origin?: string | null) {
  return origin && origin !== MMM_ORIGIN && origin !== MM_MOBILE_ORIGIN;
}

export { isDappOrigin };
