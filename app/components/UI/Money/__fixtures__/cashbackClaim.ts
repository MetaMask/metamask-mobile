import type { CardCashbackClaim } from '../../../../core/Engine/controllers/card-controller/types';
import { MONEY_ACCOUNT_ADDRESS } from './vaultShareValuations';

export function cashbackClaim(
  overrides: Partial<CardCashbackClaim> = {},
): CardCashbackClaim {
  return {
    status: 'pending',
    amount: '0.3',
    moneyAddress: MONEY_ACCOUNT_ADDRESS,
    submittedAt: 1_000_000,
    txHash: null,
    ...overrides,
  };
}
