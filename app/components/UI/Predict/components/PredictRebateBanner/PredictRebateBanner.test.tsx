import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { RebateQuoteResponse } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { usePredictRebateQuote } from '../../hooks/usePredictRebateQuote';
import PredictRebateBanner, {
  PREDICT_REBATE_BANNER_TEST_ID,
  predictRebatePercent,
} from './PredictRebateBanner';

jest.mock('../../hooks/usePredictRebateQuote', () => ({
  usePredictRebateQuote: jest.fn(),
}));

jest.mock('../../../../hooks/useTooltipModal', () => ({
  __esModule: true,
  default: () => ({ openTooltipModal: jest.fn() }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

const mockUsePredictRebateQuote = jest.mocked(usePredictRebateQuote);

const QUOTE = {
  product: 'predict',
  eligible: true,
  rebateBips: 1000,
  reason: null,
  eligibleFee: { shareOfBuilderFee: '0.75', capBps: 300 },
} satisfies RebateQuoteResponse;

const mockQuote = (data: unknown) =>
  mockUsePredictRebateQuote.mockReturnValue({
    data,
  } as ReturnType<typeof usePredictRebateQuote>);

describe('PredictRebateBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the rebate as a share of the MetaMask fee', () => {
    mockQuote({
      product: 'predict',
      eligible: true,
      rebateBips: 1000,
      reason: null,
      eligibleFee: { shareOfBuilderFee: '0.75', capBps: 300 },
    });

    render(<PredictRebateBanner builderFeeUsd={0.4} notionalUsd={10} />);

    expect(screen.getByTestId(PREDICT_REBATE_BANNER_TEST_ID)).toBeOnTheScreen();
    expect(
      screen.getByText('rewards.rebate.banner:{"percent":7.5}'),
    ).toBeOnTheScreen();
  });

  it('shows the banner for a membership order, where only the provider fee is charged', () => {
    mockQuote(QUOTE);

    render(<PredictRebateBanner builderFeeUsd={0.2} notionalUsd={10} />);

    expect(
      screen.getByText('rewards.rebate.banner:{"percent":7.5}'),
    ).toBeOnTheScreen();
  });

  it('renders nothing on a waived market, where every fee is 0', () => {
    mockQuote(QUOTE);

    render(<PredictRebateBanner builderFeeUsd={0} notionalUsd={10} />);

    expect(
      screen.queryByTestId(PREDICT_REBATE_BANNER_TEST_ID),
    ).not.toBeOnTheScreen();
  });

  it.each([
    ['no quote yet', undefined],
    [
      'a backend without eligibleFee',
      { product: 'predict', eligible: true, rebateBips: 1000, reason: null },
    ],
    [
      'PRODUCT_NOT_SUPPORTED',
      {
        product: 'predict',
        eligible: false,
        rebateBips: 0,
        reason: 'PRODUCT_NOT_SUPPORTED',
      },
    ],
  ])('renders nothing for %s', (_name, data) => {
    mockQuote(data);

    render(<PredictRebateBanner builderFeeUsd={0.4} notionalUsd={10} />);

    expect(
      screen.queryByTestId(PREDICT_REBATE_BANNER_TEST_ID),
    ).not.toBeOnTheScreen();
  });
});

describe('predictRebatePercent', () => {
  it('pays 7.5 % of the $0.40 builder fee on a $10 bet at 2 % + 2 %', () => {
    const percent = predictRebatePercent(QUOTE, 0.4, 10);

    expect(percent).toBe(7.5);
    // $0.03, the eligible $0.30 at 1000 bips.
    expect(((percent ?? 0) / 100) * 0.4).toBeCloseTo(0.03, 10);
  });

  it('keeps the provider fee as the base when a membership waives the MetaMask fee', () => {
    const percent = predictRebatePercent(QUOTE, 0.2, 10);

    expect(percent).toBe(7.5);
    expect(((percent ?? 0) / 100) * 0.2).toBeCloseTo(0.015, 10);
  });

  it('applies the rebate to the eligible share of the fee', () => {
    // A 4 % fee on $1: 75 % of $0.04 and 3 % of $1 are both $0.03.
    expect(predictRebatePercent(QUOTE, 0.04, 1)).toBe(7.5);
  });

  it('applies the cap when it is below the share', () => {
    // A 5 % fee on $1: the cap, $0.03, is 60 % of the $0.05 fee.
    expect(predictRebatePercent(QUOTE, 0.05, 1)).toBe(6);
  });

  it('uses the share alone when there is no cap', () => {
    expect(
      predictRebatePercent(
        { ...QUOTE, eligibleFee: { shareOfBuilderFee: '0.75', capBps: null } },
        0.05,
        1,
      ),
    ).toBe(7.5);
  });

  it.each([
    ['no quote', undefined, 0.04],
    [
      'a backend without eligibleFee',
      { ...QUOTE, eligibleFee: undefined },
      0.04,
    ],
    [
      'PRODUCT_NOT_SUPPORTED',
      {
        product: 'predict',
        eligible: false,
        rebateBips: 0,
        reason: 'PRODUCT_NOT_SUPPORTED',
      } satisfies RebateQuoteResponse,
      0.04,
    ],
    ['a zero rate', { ...QUOTE, rebateBips: 0 }, 0.04],
    ['a waived fee', QUOTE, 0],
    [
      'an unreadable share',
      { ...QUOTE, eligibleFee: { shareOfBuilderFee: 'abc', capBps: 300 } },
      0.04,
    ],
    [
      'an unreadable cap',
      {
        ...QUOTE,
        eligibleFee: {
          shareOfBuilderFee: '0.75',
          capBps: '300' as unknown as number,
        },
      },
      0.04,
    ],
  ] as [string, RebateQuoteResponse | undefined, number][])(
    'shows nothing for %s',
    (_name, quote, fee) => {
      expect(predictRebatePercent(quote, fee, 1)).toBeNull();
    },
  );
});
