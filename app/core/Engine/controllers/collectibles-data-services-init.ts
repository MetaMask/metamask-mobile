import { createPackPartnerApi } from '../../../components/UI/Collectibles/services/clients/PackPartnerApiClient';
import {
  PackPartnerDataService,
  type PackPartnerDataServiceMessenger,
} from '../../../components/UI/Collectibles/services/data/PackPartnerDataService';
import type { MessengerClientInitFunction } from '../types';

export const packPartnerDataServiceInit: MessengerClientInitFunction<
  PackPartnerDataService,
  PackPartnerDataServiceMessenger
> = ({ controllerMessenger }) => ({
  controller: new PackPartnerDataService({
    messenger: controllerMessenger,
    api: createPackPartnerApi(),
  }),
});
