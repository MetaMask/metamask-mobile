import { CardType } from '../types';
import { getCashbackPercentage } from './cashbackRate';

describe('getCashbackPercentage', () => {
  it.each([
    ['immersve', CardType.VIRTUAL, '3'],
    ['baanx', CardType.METAL, '3'],
    ['baanx', CardType.VIRTUAL, '1'],
    [null, undefined, '1'],
  ])('returns the rate for provider %s and card %s', (provider, type, rate) => {
    expect(getCashbackPercentage(provider, type)).toBe(rate);
  });
});
