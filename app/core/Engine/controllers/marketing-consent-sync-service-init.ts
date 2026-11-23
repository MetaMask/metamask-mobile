import {
  MarketingConsentSyncService,
  type MarketingConsentSyncServiceMessenger,
} from '@metamask/marketing-consent-sync-service';
import type { MessengerClientInitFunction } from '../types';

export const marketingConsentSyncServiceInit: MessengerClientInitFunction<
  MarketingConsentSyncService,
  MarketingConsentSyncServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new MarketingConsentSyncService({
    messenger: controllerMessenger,
    clientType: 'mobile',
  });
  return { controller };
};
