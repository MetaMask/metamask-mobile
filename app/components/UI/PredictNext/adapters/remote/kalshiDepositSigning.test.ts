import type { PredictAmount } from '../../types';
import {
  depositAmountCents,
  isValidDepositParams,
  kalshiDepositSigningInputs,
} from './kalshiDepositSigning';

const CLIENT_OPERATION_ID = '6f1c7a52-8f3e-4d8b-9c1e-2a4b5c6d7e8f';
const params = (amount: string) => ({
  amount: amount as PredictAmount,
  clientOperationId: CLIENT_OPERATION_ID,
});
const signRequest = {
  kind: 'sign_request' as const,
  amountCents: 2550,
  clientOperationId: CLIENT_OPERATION_ID,
};

describe('depositAmountCents', () => {
  it.each([
    ['1', 100],
    ['25.5', 2550],
    ['25.50', 2550],
    ['25.05', 2505],
    ['1000000', 100_000_000],
  ])('reads %s as %d cents', (amount, cents) => {
    expect(depositAmountCents(amount)).toBe(cents);
  });

  it.each([
    '0.99',
    '0',
    '25.505',
    '025',
    '-25',
    '2.5e1',
    '25.',
    '.5',
    '',
    '99999999999999999',
  ])('refuses %j', (amount) => {
    expect(depositAmountCents(amount)).toBeUndefined();
  });
});

describe('isValidDepositParams', () => {
  it('needs a deposit amount and a UUID v4 key', () => {
    expect(isValidDepositParams(params('25.50'))).toBe(true);
    expect(isValidDepositParams(params('0.50'))).toBe(false);
    expect(
      isValidDepositParams({
        ...params('25.50'),
        clientOperationId: '019a7c3e-5c1a-7d2e-9a40-3f1c2b0d4e5f',
      }),
    ).toBe(false);
  });
});

describe('kalshiDepositSigningInputs', () => {
  it('signs the entered amount, Base and the key', () => {
    expect(
      kalshiDepositSigningInputs(params('25.5'), signRequest),
    ).toStrictEqual({
      amountCents: 2550,
      networks: ['base'],
      clientOperationId: CLIENT_OPERATION_ID,
    });
  });

  it.each([
    ['another amount', { amountCents: 2551 }],
    [
      'another key',
      { clientOperationId: '0b5b8a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b' },
    ],
  ])('signs nothing when the server names %s', (_name, override) => {
    expect(
      kalshiDepositSigningInputs(params('25.50'), {
        ...signRequest,
        ...override,
      }),
    ).toBeUndefined();
  });

  it('signs nothing for an amount the backend would refuse', () => {
    expect(
      kalshiDepositSigningInputs(params('0.5'), {
        ...signRequest,
        amountCents: 50,
      }),
    ).toBeUndefined();
  });
});
