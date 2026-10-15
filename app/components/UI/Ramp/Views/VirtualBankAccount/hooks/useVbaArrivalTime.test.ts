import type { PaymentMethod } from '@metamask/ramps-controller';
import { renderHook } from '@testing-library/react-native';
import { getVbaArrivalTimeframe, useVbaArrivalTime } from './useVbaArrivalTime';
import { useVbaEligibility } from './useVbaEligibility';
import { useMoneyAccountDepositAssetId } from '../../../../Money/hooks/useMoneyAccountDepositAssetId';
import { useRampsPaymentMethodsForContext } from '../../../hooks/useRampsPaymentMethods';

jest.mock('./useVbaEligibility');
jest.mock('../../../../Money/hooks/useMoneyAccountDepositAssetId');
jest.mock('../../../hooks/useRampsPaymentMethods');

const mockUseVbaEligibility = jest.mocked(useVbaEligibility);
const mockUseMoneyAccountDepositAssetId = jest.mocked(
  useMoneyAccountDepositAssetId,
);
const mockUseRampsPaymentMethodsForContext = jest.mocked(
  useRampsPaymentMethodsForContext,
);

const buildMethod = ({
  id = '/payments/bank-transfer',
  paymentType = 'bank-transfer',
  isManualBankTransfer,
  delay,
}: {
  id?: string;
  paymentType?: string;
  isManualBankTransfer?: boolean;
  delay?: number[];
}) =>
  ({
    id,
    paymentType,
    ...(isManualBankTransfer !== undefined && { isManualBankTransfer }),
    ...(delay !== undefined && { delay }),
  }) as unknown as PaymentMethod;

describe('getVbaArrivalTimeframe', () => {
  it('formats the manual bank transfer delay range as a timeframe', () => {
    const methods = [
      buildMethod({
        id: '/payments/debit-credit-card',
        paymentType: 'debit-credit-card',
        delay: [5, 10],
      }),
      buildMethod({ isManualBankTransfer: true, delay: [2880, 4320] }),
    ];

    expect(getVbaArrivalTimeframe(methods)).toBe('2 - 3 business days');
  });

  it('falls back to a bank-transfer payment type when no method is flagged manual', () => {
    const methods = [
      buildMethod({
        id: '/payments/debit-credit-card',
        paymentType: 'debit-credit-card',
        delay: [5, 10],
      }),
      buildMethod({ delay: [120, 240] }),
    ];

    expect(getVbaArrivalTimeframe(methods)).toBe('2 - 4 hours');
  });

  it('prefers the manual bank transfer over a later bank-transfer payment type', () => {
    const methods = [
      buildMethod({
        id: '/payments/instant-transfer',
        paymentType: 'bank-transfer',
        delay: [1, 5],
      }),
      buildMethod({ isManualBankTransfer: true, delay: [2880, 4320] }),
    ];

    expect(getVbaArrivalTimeframe(methods)).toBe('2 - 3 business days');
  });

  it('lowercases locale tokens so the value reads mid-sentence', () => {
    const methods = [buildMethod({ delay: [0, 1440] })];

    expect(getVbaArrivalTimeframe(methods)).toBe('less than 1 business day');
  });

  it('lowercases the instant token for a zero-to-zero delay', () => {
    const methods = [buildMethod({ delay: [0, 0] })];

    expect(getVbaArrivalTimeframe(methods)).toBe('instant');
  });

  it('stops at the manual bank-transfer entry even when it has no delay', () => {
    const methods = [
      buildMethod({ isManualBankTransfer: true }),
      buildMethod({ delay: [2880, 4320] }),
    ];

    expect(getVbaArrivalTimeframe(methods)).toBeUndefined();
  });

  it.each([
    [
      'no bank-transfer method at all',
      [
        buildMethod({
          id: '/payments/debit-credit-card',
          paymentType: 'debit-credit-card',
          delay: [5, 10],
        }),
      ],
    ],
    ['no delay field on the method', [buildMethod({})]],
    ['a single-value delay', [buildMethod({ delay: [60] })]],
    ['an empty method list', []],
  ])('is undefined with %s', (_label, methods) => {
    expect(getVbaArrivalTimeframe(methods as PaymentMethod[])).toBeUndefined();
  });
});

describe('useVbaArrivalTime', () => {
  const DEPOSIT_ASSET_ID = 'eip155:133/erc20:0xmusd' as const;

  const setup = ({
    eligibility,
    paymentMethods = [
      buildMethod({ isManualBankTransfer: true, delay: [2880, 4320] }),
    ],
  }: {
    /** Overrides for the eligibility result; spread so `undefined` wins. */
    eligibility?: { location?: string | undefined };
    paymentMethods?: PaymentMethod[];
  } = {}) => {
    mockUseVbaEligibility.mockReturnValue({
      location: 'BR',
      ...eligibility,
    } as ReturnType<typeof useVbaEligibility>);
    mockUseMoneyAccountDepositAssetId.mockReturnValue(
      DEPOSIT_ASSET_ID as ReturnType<typeof useMoneyAccountDepositAssetId>,
    );
    mockUseRampsPaymentMethodsForContext.mockReturnValue({
      paymentMethods,
    } as ReturnType<typeof useRampsPaymentMethodsForContext>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('queries the catalog for the VBA region and returns the formatted timeframe', () => {
    const { result } = renderHook(() => useVbaArrivalTime());

    expect(mockUseRampsPaymentMethodsForContext).toHaveBeenCalledWith({
      regionCode: 'br',
      assetId: DEPOSIT_ASSET_ID,
      autoSelectProvider: true,
      restrictToKnownOrNativeProviders: true,
      updateState: false,
    });
    expect(result.current.arrivalTimeframe).toBe('2 - 3 business days');
  });

  it('derives the country-level region code from a country-state geolocation', () => {
    setup({ eligibility: { location: 'BR-SP' } });

    renderHook(() => useVbaArrivalTime());

    expect(mockUseRampsPaymentMethodsForContext).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: 'br' }),
    );
  });

  it('disables the query when the IP geolocation is not a VBA-served region', () => {
    setup({ eligibility: { location: 'PT' } });

    renderHook(() => useVbaArrivalTime());

    expect(mockUseRampsPaymentMethodsForContext).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: '' }),
    );
  });

  it('disables the query when the IP geolocation is unknown', () => {
    setup({ eligibility: { location: undefined } });

    renderHook(() => useVbaArrivalTime());

    expect(mockUseRampsPaymentMethodsForContext).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: '' }),
    );
  });

  it('is undefined while the catalog has no delay data', () => {
    setup({ paymentMethods: [] });

    const { result } = renderHook(() => useVbaArrivalTime());

    expect(result.current.arrivalTimeframe).toBeUndefined();
  });
});
