import { createPackPartnerApi } from '../clients/PackPartnerApiClient';
import {
  PackPartnerDataService,
  type PackPartnerDataServiceMessenger,
} from './PackPartnerDataService';
import {
  CollectiblesApiDataService,
  type CollectiblesApiDataServiceMessenger,
} from './CollectiblesApiDataService';
import {
  CollectiblesSocialApiDataService,
  type CollectiblesSocialApiDataServiceMessenger,
} from './CollectiblesSocialApiDataService';
import type { MessengerClientInitFunction } from '../../../../../core/Engine/types';
import { CollectiblesApiClient } from '../clients/CollectiblesApiClient';
import { CollectiblesSocialApiClient } from '../clients/CollectiblesSocialApiClient';

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
    client: new CollectiblesApiClient(),
  }),
});

export const collectiblesSocialApiDataServiceInit: MessengerClientInitFunction<
  CollectiblesSocialApiDataService,
  CollectiblesSocialApiDataServiceMessenger
> = ({ controllerMessenger }) => ({
  controller: new CollectiblesSocialApiDataService({
    messenger: controllerMessenger,
    client: new CollectiblesSocialApiClient(),
  }),
});
