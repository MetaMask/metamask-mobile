import {
  MarketingConsentController,
  type MarketingConsentControllerMessenger,
} from '@metamask/marketing-consent-controller';
import type { MessengerClientInitFunction } from '../types';

export const marketingConsentControllerInit: MessengerClientInitFunction<
  MarketingConsentController,
  MarketingConsentControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new MarketingConsentController({
    messenger: controllerMessenger,
    state: persistedState.MarketingConsentController,
    clientType: 'mobile',
  });
  return { controller };
};
