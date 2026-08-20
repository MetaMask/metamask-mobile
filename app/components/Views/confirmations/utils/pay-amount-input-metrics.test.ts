import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { RootState } from '../../../../reducers';
import { resolveABTestAssignment } from '../../../../util/abTest';
import { getMoneyAccountDepositIntent } from '../../../UI/Money/utils/moneyAccountDepositIntent';
import { selectPrefilledAmountConfig } from '../../../../selectors/featureFlagController/confirmations';
import { MoneyAccountDepositPrefillVariant } from '../hooks/transactions/abTestConfig';
import {
  getDepositPrefillAmountInputType,
  MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED,
  MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED_50,
  MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED_MAX,
  resolveMoneyAccountDepositPrefillPresented,
} from './pay-amount-input-metrics';

jest.mock('../../../../util/abTest', () => ({
  resolveABTestAssignment: jest.fn(),
}));

jest.mock('../../../UI/Money/utils/moneyAccountDepositIntent', () => ({
  getMoneyAccountDepositIntent: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/confirmations', () => ({
  selectPrefilledAmountConfig: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController', () => ({
  selectRemoteFeatureFlags: jest.fn(() => ({})),
  selectFeatureFlagThresholdGroups: jest.fn(() => ({})),
}));

const resolveABTestAssignmentMock = jest.mocked(resolveABTestAssignment);
const getMoneyAccountDepositIntentMock = jest.mocked(
  getMoneyAccountDepositIntent,
);
const selectPrefilledAmountConfigMock = jest.mocked(
  selectPrefilledAmountConfig,
);

describe('getDepositPrefillAmountInputType', () => {
  it('returns prefilled_max for uncapped 100% prefill', () => {
    expect(
      getDepositPrefillAmountInputType({
        percentage: 100,
        isLimitCapped: false,
      }),
    ).toBe(MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED_MAX);
  });

  it('returns prefilled_50 for uncapped 50% prefill', () => {
    expect(
      getDepositPrefillAmountInputType({
        percentage: 50,
        isLimitCapped: false,
      }),
    ).toBe(MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED_50);
  });

  it('returns prefilled for limit-capped amounts', () => {
    expect(
      getDepositPrefillAmountInputType({
        percentage: 100,
        isLimitCapped: true,
      }),
    ).toBe(MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED);
  });
});

describe('resolveMoneyAccountDepositPrefillPresented', () => {
  const state = {} as RootState;
  const depositTx = {
    type: TransactionType.moneyAccountDeposit,
    batchId: '0xbatch',
  } as unknown as TransactionMeta;

  beforeEach(() => {
    jest.clearAllMocks();
    selectPrefilledAmountConfigMock.mockReturnValue({ enabled: true });
    getMoneyAccountDepositIntentMock.mockReturnValue(undefined);
    resolveABTestAssignmentMock.mockReturnValue({
      variantName: MoneyAccountDepositPrefillVariant.Treatment,
      isActive: true,
    });
  });

  it('returns true for money deposit treatment when kill-switch is on', () => {
    expect(resolveMoneyAccountDepositPrefillPresented(depositTx, state)).toBe(
      true,
    );
  });

  it('returns false for control variant', () => {
    resolveABTestAssignmentMock.mockReturnValue({
      variantName: MoneyAccountDepositPrefillVariant.Control,
      isActive: true,
    });

    expect(resolveMoneyAccountDepositPrefillPresented(depositTx, state)).toBe(
      false,
    );
  });

  it('returns true for addMusd even on control', () => {
    resolveABTestAssignmentMock.mockReturnValue({
      variantName: MoneyAccountDepositPrefillVariant.Control,
      isActive: true,
    });
    getMoneyAccountDepositIntentMock.mockReturnValue('addMusd');

    expect(resolveMoneyAccountDepositPrefillPresented(depositTx, state)).toBe(
      true,
    );
  });

  it('returns false for non-deposit transaction types', () => {
    expect(
      resolveMoneyAccountDepositPrefillPresented(
        { type: TransactionType.perpsDeposit } as unknown as TransactionMeta,
        state,
      ),
    ).toBe(false);
  });
});
