import { createPackPartnerApi } from '../clients/PackPartnerApiClient';
import {
  PackPartnerDataService,
  type PackPartnerDataServiceMessenger,
} from './PackPartnerDataService';
import {
  CollectiblesApiDataService,
  type CollectiblesApiDataServiceMessenger,
} from './CollectiblesApiDataService';
import type { MessengerClientInitFunction } from '../../../../../core/Engine/types';
import { CollectiblesApiClient } from '../clients/CollectiblesApiClient';

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
