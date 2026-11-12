import { createPackPartnerApi } from '../../../components/UI/Collectibles/services/clients/PackPartnerApiClient';
import { PACK_PARTNER_ENVIRONMENT } from '../../../components/UI/Collectibles/providers/pack-partner/constants';
import { packPartnerQueries } from '../../../components/UI/Collectibles/services/data/packPartnerQueries';
import {
  PackPartnerDataService,
  type PackPartnerDataServiceMessenger,
} from '../../../components/UI/Collectibles/services/data/PackPartnerDataService';
import {
  CollectiblesApiDataService,
  type CollectiblesApiDataServiceMessenger,
} from '../../../components/UI/Collectibles/services/data/CollectiblesApiDataService';
import {
  CollectiblesSocialApiDataService,
  type CollectiblesSocialApiDataServiceMessenger,
} from '../../../components/UI/Collectibles/services/data/CollectiblesSocialApiDataService';
import type { MessengerClientInitFunction } from '../types';
import { MockCollectiblesApiClient } from '../../../components/UI/Collectibles/services/clients/MockCollectiblesApiClient';
import { MockCollectiblesSocialApiClient } from '../../../components/UI/Collectibles/services/clients/MockCollectiblesSocialApiClient';

export const packPartnerDataServiceInit: MessengerClientInitFunction<
  PackPartnerDataService,
  PackPartnerDataServiceMessenger
> = ({ controllerMessenger }) => ({
  controller: new PackPartnerDataService({
    messenger: controllerMessenger,
    api: createPackPartnerApi(),
  }),
});

export const collectiblesApiDataServiceInit: MessengerClientInitFunction<
  CollectiblesApiDataService,
  CollectiblesApiDataServiceMessenger
> = ({ controllerMessenger }) => ({
  controller: new CollectiblesApiDataService({
    messenger: controllerMessenger,
    client: new MockCollectiblesApiClient(),
  }),
});

export const collectiblesSocialApiDataServiceInit: MessengerClientInitFunction<
  CollectiblesSocialApiDataService,
  CollectiblesSocialApiDataServiceMessenger
> = ({ controllerMessenger }) => ({
  controller: new CollectiblesSocialApiDataService({
    messenger: controllerMessenger,
    client: new MockCollectiblesSocialApiClient(),
  }),
});
