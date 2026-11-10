import { amountToCents, venueOrderValues } from './orderCommit';
import type { PredictOrderPreview } from '../../types';

describe('amountToCents', () => {
  it.each([
    ['5', 500],
    ['0.5', 50],
    ['12.34', 1234],
  ])('reads %s as %d cents', (amount, cents) => {
    expect(amountToCents(amount)).toBe(cents);
  });

  it.each(['', '1.234', '-1', '1,5', 'abc'])('refuses %p', (amount) => {
    expect(amountToCents(amount)).toBeUndefined();
  });
});

describe('venueOrderValues', () => {
  const buyPreview = {
    action: 'buy',
    estimatedContracts: 10,
    // The backend quotes the worst ask on every preview, buy or sell.
    limitPrice: '0.4600',
  } as unknown as PredictOrderPreview;
  const sellPreview = {
    action: 'sell',
    requestedContracts: 7,
    limitPrice: '0.53',
  } as unknown as PredictOrderPreview;

  it('counts the quoted contracts and prices the yes leg on a yes buy', () => {
    expect(venueOrderValues('buy', 'yes', buyPreview)).toEqual({
      count: '10.00',
      price: '0.4600',
    });
  });

  it('complements the yes leg on a no buy, exactly', () => {
    expect(venueOrderValues('buy', 'no', buyPreview)).toEqual({
      count: '10.00',
      price: '0.5400',
    });
  });

  it('counts the offered contracts on a sell', () => {
    expect(venueOrderValues('sell', 'yes', sellPreview)).toEqual({
      count: '7.00',
      price: '0.5300',
    });
    expect(venueOrderValues('sell', 'no', sellPreview)).toEqual({
      count: '7.00',
      price: '0.4700',
    });
  });

  it('pads a short fraction to the wire scale', () => {
    expect(
      venueOrderValues('buy', 'yes', {
        ...buyPreview,
        limitPrice: '0.46',
      } as unknown as PredictOrderPreview),
    ).toEqual({ count: '10.00', price: '0.4600' });
  });

  it('signs nothing when a buy lacks the quoted price', () => {
    const { limitPrice, ...withoutLimit } = buyPreview;
    expect(
      venueOrderValues('buy', 'yes', withoutLimit as PredictOrderPreview),
    ).toBeUndefined();
  });

  it('refuses a malformed limit price', () => {
    expect(
      venueOrderValues('buy', 'yes', {
        ...buyPreview,
        limitPrice: 'NaN',
      } as unknown as PredictOrderPreview),
    ).toBeUndefined();
    expect(
      venueOrderValues('buy', 'yes', {
        ...buyPreview,
        limitPrice: '1.2',
      } as unknown as PredictOrderPreview),
    ).toBeUndefined();
  });
});
