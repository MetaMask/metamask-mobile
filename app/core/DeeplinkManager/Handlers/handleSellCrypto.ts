import { RampType } from '../../../reducers/fiatOrders/types';
import handleRampUrl from './handleRampUrl';

export function handleSellCrypto(rampPath: string) {
  handleRampUrl({
    rampPath,
    rampType: RampType.SELL,
  });
}
