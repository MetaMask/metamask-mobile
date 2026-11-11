import {
  SentinelFeeTokensDataService,
  type SentinelFeeTokensDataServiceMessenger,
} from '../../../components/UI/Bridge/services/SentinelFeeTokensDataService';
import type { MessengerClientInitFunction } from '../types';

export const sentinelFeeTokensDataServiceInit: MessengerClientInitFunction<
  SentinelFeeTokensDataService,
  SentinelFeeTokensDataServiceMessenger
> = ({ controllerMessenger }) => ({
  controller: new SentinelFeeTokensDataService({
    messenger: controllerMessenger,
  }),
});
