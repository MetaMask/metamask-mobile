import { RampType } from '../../../reducers/fiatOrders/types';
import handleRampUrl from './handleRampUrl';

export function handleBuyCrypto(rampPath: string) {
  handleRampUrl({
    rampPath,
    rampType: RampType.BUY,
  });
}
