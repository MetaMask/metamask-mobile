import { createPackPartnerApi } from '../clients/PackPartnerApiClient';
import {
  PackPartnerDataService,
  type PackPartnerDataServiceMessenger,
} from './PackPartnerDataService';
import type { MessengerClientInitFunction } from '../../../../../core/Engine/types';

export const packPartnerDataServiceInit: MessengerClientInitFunction<
  PackPartnerDataService,
  PackPartnerDataServiceMessenger
> = ({ controllerMessenger }) => ({
  controller: new PackPartnerDataService({
    messenger: controllerMessenger,
    api: createPackPartnerApi(),
  }),
});
