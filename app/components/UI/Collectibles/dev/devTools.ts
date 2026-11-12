import {
  PACK_PARTNER_ENVIRONMENT,
  type PackPartnerEnvironment,
} from '../providers/pack-partner/constants/environment';

/** Dev tools follow the Collectibles network, never the build's development flag. */
export const isCollectiblesDevEnabled = (
  environment: PackPartnerEnvironment = PACK_PARTNER_ENVIRONMENT,
): boolean => environment === 'devnet';
