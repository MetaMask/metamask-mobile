// This file holds all events that the mobile app is going to
// track if the user has the MetaMetrics option ENABLED.
// In case that the MetaMetrics option is DISABLED, then none
// of these events should be tracked in any kind of service.

import { IMetaMetricsEvent } from './MetaMetrics.interface';

const generateOpt = (name: string, anonymous?: boolean): IMetaMetricsEvent => ({
  event: name,
  anonymous: anonymous || false,
});

const MetaMetricsEvents = {
  WALLET: {
    OPEN: generateOpt('Wallet Opened'),
    TOKEN_ADDED: generateOpt('Token Added'),
    COLLECTIBLE_ADDED: generateOpt('Collectible Added'),
  },
};

export default MetaMetricsEvents;
