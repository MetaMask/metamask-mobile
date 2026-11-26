import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import type { CardCashbackClaim } from '../../../../core/Engine/controllers/card-controller/types';
import type { AccountsApiActivity } from '../types/moneyActivity';
import {
  cashbackClaimDisplayInfo,
  isCashbackClaimExpired,
  isSettlingCashbackActivity,
  resolveCashbackClaim,
} from './cashbackClaim';

const CLAIM_HASH: Hex =
  '0x1111111111111111111111111111111111111111111111111111111111111111';
const ACTIVITY_HASH: Hex =
  '0x2222222222222222222222222222222222222222222222222222222222222222';
const TOKEN_ADDRESS: Hex =
  '0x3333333333333333333333333333333333333333333333333333333333333333';

const createClaim = (
  overrides: Partial<CardCashbackClaim> = {},
): CardCashbackClaim => ({
  status: 'pending',
  amount: '10.5',
  moneyAddress: '0x4444444444444444444444444444444444444444',
  submittedAt: 1_000_000,
  txHash: CLAIM_HASH,
  ...overrides,
});

type CashbackActivity = Extract<AccountsApiActivity, { kind: 'cashback' }>;

const createCashbackActivity = (
  overrides: Partial<CashbackActivity> = {},
): CashbackActivity => ({
  kind: 'cashback',
  hash: ACTIVITY_HASH,
  time: 1_000_000,
  chainId: '0xe708',
  token: {
    address: TOKEN_ADDRESS,
    symbol: 'mUSD',
    decimals: 6,
  },
  amount: '10500000',
  receivedFrom: TOKEN_ADDRESS,
  ...overrides,
});

describe('cashbackClaimDisplayInfo', () => {
  it('labels a pending claim as Receiving mUSD back', () => {
    const display = cashbackClaimDisplayInfo(createClaim());

    expect(display).toMatchObject({
      label: 'Receiving',
      description: 'mUSD back',
      primaryAmount: '+10.50 mUSD',
      fiatAmount: '',
      isIncoming: true,
      icon: IconName.Card,
      status: 'pending',
      showPrimaryAmount: true,
    });
  });

  it('labels a failed claim with the failure copy and signed zero', () => {
    const display = cashbackClaimDisplayInfo(createClaim({ status: 'failed' }));

    expect(display).toMatchObject({
      label: 'mUSD back',
      description: 'Failed',
      primaryAmount: '+0.00 mUSD',
      fiatAmount: '+$0.00',
      status: 'failed',
      showPrimaryAmount: false,
    });
  });
});

describe('isSettlingCashbackActivity', () => {
  it('matches a cashback row by tx hash', () => {
    const claim = createClaim({ txHash: CLAIM_HASH });

    const settled = isSettlingCashbackActivity(claim, [
      createCashbackActivity({ hash: CLAIM_HASH }),
    ]);

    expect(settled).toBe(true);
  });

  it('matches by amount and time when the claim has no tx hash', () => {
    const claim = createClaim({ txHash: null });

    const settled = isSettlingCashbackActivity(claim, [
      createCashbackActivity(),
    ]);

    expect(settled).toBe(true);
  });

  it('ignores an amount match outside the time tolerance', () => {
    const claim = createClaim({ txHash: null, submittedAt: 1_000_000 });

    const settled = isSettlingCashbackActivity(claim, [
      createCashbackActivity({ time: 939_999 }),
    ]);

    expect(settled).toBe(false);
  });

  it('ignores non-cashback rows', () => {
    const claim = createClaim();
    const refund: AccountsApiActivity = {
      kind: 'refund',
      hash: ACTIVITY_HASH,
      time: 1_000_000,
      chainId: '0xe708',
      token: {
        address: TOKEN_ADDRESS,
        symbol: 'mUSD',
        decimals: 6,
      },
      amount: '10500000',
      receivedFrom: TOKEN_ADDRESS,
    };

    const settled = isSettlingCashbackActivity(claim, [refund]);

    expect(settled).toBe(false);
  });
});

describe('isCashbackClaimExpired', () => {
  it('expires the claim at the ten minute TTL', () => {
    const claim = createClaim({ submittedAt: 1_000_000 });

    expect(isCashbackClaimExpired(claim, 1_599_999)).toBe(false);
    expect(isCashbackClaimExpired(claim, 1_600_000)).toBe(true);
  });
});

describe('resolveCashbackClaim', () => {
  const moneyAddress = createClaim().moneyAddress;

  it('shows a pending claim for the active Money account', () => {
    const claim = createClaim();

    const result = resolveCashbackClaim(claim, [], moneyAddress, 1_000_000);

    expect(result).toEqual({ visibleClaim: claim, shouldClear: false });
  });

  it('hides a claim for another Money account', () => {
    const claim = createClaim();

    const result = resolveCashbackClaim(claim, [], '0xother', 1_000_000);

    expect(result).toEqual({ visibleClaim: null, shouldClear: false });
  });

  it('clears a settled claim', () => {
    const claim = createClaim();

    const result = resolveCashbackClaim(
      claim,
      [createCashbackActivity({ hash: CLAIM_HASH })],
      moneyAddress,
      1_000_000,
    );

    expect(result).toEqual({ visibleClaim: null, shouldClear: true });
  });

  it('clears an expired claim', () => {
    const claim = createClaim();

    const result = resolveCashbackClaim(claim, [], moneyAddress, 1_600_000);

    expect(result).toEqual({ visibleClaim: null, shouldClear: true });
  });

  it('returns no claim when none exists', () => {
    const result = resolveCashbackClaim(null, [], moneyAddress, 1_000_000);

    expect(result).toEqual({ visibleClaim: null, shouldClear: false });
  });
});
