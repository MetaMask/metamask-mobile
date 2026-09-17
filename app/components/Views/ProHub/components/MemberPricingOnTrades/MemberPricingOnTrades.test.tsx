import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MemberPricingOnTrades from './MemberPricingOnTrades';
import TradeAllowanceRow from './TradeAllowanceRow';
import { MemberPricingOnTradesTestIds } from './MemberPricingOnTrades.testIds';
import {
  MOCK_TRADE_ALLOWANCES,
  type TradeAllowanceItem,
} from '../../ProHub.constants';
import { strings } from '../../../../../../locales/i18n';
import {
  MoneyAccountPlusBenefitsStatus,
  useMoneyAccountPlusBenefits,
} from '../../../../../hooks/useMoneyAccountPlusBenefits';

jest.mock('../../../../../hooks/useMoneyAccountPlusBenefits', () => ({
  ...jest.requireActual('../../../../../hooks/useMoneyAccountPlusBenefits'),
  useMoneyAccountPlusBenefits: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: unknown[]) => ({}),
  }),
}));

const mockUseMoneyAccountPlusBenefits = jest.mocked(
  useMoneyAccountPlusBenefits,
);

const renderMemberPricingOnTrades = () => render(<MemberPricingOnTrades />);

const renderTradeAllowanceRow = (item: TradeAllowanceItem) =>
  render(<TradeAllowanceRow item={item} />);

const toRegex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const getFlattenedStyle = (style: unknown) => {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean));
  }

  return style;
};

describe('MemberPricingOnTrades', () => {
  beforeEach(() => {
    mockUseMoneyAccountPlusBenefits.mockReturnValue({
      status: MoneyAccountPlusBenefitsStatus.Ready,
      items: MOCK_TRADE_ALLOWANCES,
      resetsOn: 'Sep 15',
      isRefreshing: false,
      hasError: false,
      retry: jest.fn(),
    });
  });

  it('renders the section title from i18n', () => {
    const { getByTestId } = renderMemberPricingOnTrades();

    const title = getByTestId(MemberPricingOnTradesTestIds.TITLE);

    expect(title).toHaveTextContent(strings('pro_hub.member_pricing.title'));
  });

  it('renders a row and progress bar for each trade allowance', () => {
    const { getByTestId } = renderMemberPricingOnTrades();

    MOCK_TRADE_ALLOWANCES.forEach((item) => {
      const row = getByTestId(MemberPricingOnTradesTestIds.ROW(item.id));
      const progress = getByTestId(
        MemberPricingOnTradesTestIds.PROGRESS(item.id),
      );

      expect(row).toBeOnTheScreen();
      expect(progress).toBeOnTheScreen();
      expect(row).toHaveTextContent(
        toRegex(strings(`pro_hub.member_pricing.${item.id}.label`)),
      );
    });
  });

  it('renders the shared reset date under the rows', () => {
    const { getByTestId } = renderMemberPricingOnTrades();

    expect(
      getByTestId(MemberPricingOnTradesTestIds.RESETS_ON),
    ).toHaveTextContent(
      strings('pro_hub.member_pricing.resets_on', { date: 'Sep 15' }),
    );
  });

  it('renders skeletons instead of rows while benefits load', () => {
    mockUseMoneyAccountPlusBenefits.mockReturnValue({
      status: MoneyAccountPlusBenefitsStatus.Loading,
      items: [],
      resetsOn: undefined,
      isRefreshing: true,
      hasError: false,
      retry: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderMemberPricingOnTrades();

    expect(
      getByTestId(MemberPricingOnTradesTestIds.LOADING_SKELETON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MemberPricingOnTradesTestIds.ROW('swaps')),
    ).not.toBeOnTheScreen();
    expect(getByTestId(MemberPricingOnTradesTestIds.TITLE)).toBeOnTheScreen();
  });

  it('renders an error with retry when benefits cannot be loaded', () => {
    const retry = jest.fn();
    mockUseMoneyAccountPlusBenefits.mockReturnValue({
      status: MoneyAccountPlusBenefitsStatus.Failed,
      items: [],
      resetsOn: undefined,
      isRefreshing: false,
      hasError: true,
      retry,
    });

    const { getByTestId, queryByTestId } = renderMemberPricingOnTrades();

    expect(getByTestId(MemberPricingOnTradesTestIds.ERROR)).toHaveTextContent(
      toRegex(strings('pro_hub.member_pricing.load_error')),
    );
    expect(
      queryByTestId(MemberPricingOnTradesTestIds.ROW('swaps')),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(MemberPricingOnTradesTestIds.RETRY_BUTTON));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('omits a product that was not mapped from benefits', () => {
    mockUseMoneyAccountPlusBenefits.mockReturnValue({
      status: MoneyAccountPlusBenefitsStatus.Incomplete,
      items: MOCK_TRADE_ALLOWANCES.filter((item) => item.id !== 'predict'),
      resetsOn: 'Sep 15',
      isRefreshing: false,
      hasError: false,
      retry: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderMemberPricingOnTrades();

    expect(
      getByTestId(MemberPricingOnTradesTestIds.ROW('swaps')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MemberPricingOnTradesTestIds.ROW('predict')),
    ).not.toBeOnTheScreen();
  });
});

describe('TradeAllowanceRow', () => {
  it('renders swaps usage as formatted currency values', () => {
    const swapsItem = MOCK_TRADE_ALLOWANCES.find((item) => item.id === 'swaps');

    if (!swapsItem) {
      throw new Error('swaps mock item not found');
    }

    const { getByTestId } = renderTradeAllowanceRow(swapsItem);

    const row = getByTestId(MemberPricingOnTradesTestIds.ROW('swaps'));

    expect(row).toHaveTextContent(toRegex('$310'));
    expect(row).toHaveTextContent(toRegex('$500'));
  });

  it('renders predict usage as a count value', () => {
    const predictItem = MOCK_TRADE_ALLOWANCES.find(
      (item) => item.id === 'predict',
    );

    if (!predictItem) {
      throw new Error('predict mock item not found');
    }

    const { getByTestId } = renderTradeAllowanceRow(predictItem);

    const row = getByTestId(MemberPricingOnTradesTestIds.ROW('predict'));

    expect(row).toHaveTextContent(toRegex('0'));
    expect(row).toHaveTextContent(toRegex('1 trade'));
  });

  it('sets progress fill width to 62% for swaps usage of 310 of 500', () => {
    const swapsItem = MOCK_TRADE_ALLOWANCES.find((item) => item.id === 'swaps');

    if (!swapsItem) {
      throw new Error('swaps mock item not found');
    }

    const { getByTestId } = renderTradeAllowanceRow(swapsItem);

    const fill = getByTestId(
      MemberPricingOnTradesTestIds.PROGRESS_FILL('swaps'),
    );

    expect(getFlattenedStyle(fill.props.style)).toEqual(
      expect.objectContaining({ width: '62%' }),
    );
  });

  it('rounds fractional progress fill width to a whole percent', () => {
    const fractionalItem: TradeAllowanceItem = {
      id: 'swaps',
      used: 1,
      allowance: 3,
      kind: 'currency',
    };

    const { getByTestId } = renderTradeAllowanceRow(fractionalItem);

    const fill = getByTestId(
      MemberPricingOnTradesTestIds.PROGRESS_FILL('swaps'),
    );

    expect(getFlattenedStyle(fill.props.style)).toEqual(
      expect.objectContaining({ width: '33%' }),
    );
  });

  it('exposes progressbar accessibility props on the allowance track', () => {
    const swapsItem = MOCK_TRADE_ALLOWANCES.find((item) => item.id === 'swaps');

    if (!swapsItem) {
      throw new Error('swaps mock item not found');
    }

    const { getByTestId } = renderTradeAllowanceRow(swapsItem);

    const progress = getByTestId(
      MemberPricingOnTradesTestIds.PROGRESS('swaps'),
    );

    expect(progress.props.accessibilityRole).toBe('progressbar');
    expect(progress.props.accessibilityLabel).toBe(
      strings('pro_hub.member_pricing.swaps.label'),
    );
    expect(progress.props.accessibilityValue).toEqual({
      min: 0,
      max: 500,
      now: 310,
    });
  });

  it('clamps progress fill width to 100% when used exceeds allowance', () => {
    const overAllowanceItem: TradeAllowanceItem = {
      id: 'swaps',
      used: 600,
      allowance: 500,
      kind: 'currency',
    };

    const { getByTestId } = renderTradeAllowanceRow(overAllowanceItem);

    const fill = getByTestId(
      MemberPricingOnTradesTestIds.PROGRESS_FILL('swaps'),
    );
    const progress = getByTestId(
      MemberPricingOnTradesTestIds.PROGRESS('swaps'),
    );

    expect(getFlattenedStyle(fill.props.style)).toEqual(
      expect.objectContaining({ width: '100%' }),
    );
    expect(progress.props.accessibilityValue).toEqual({
      min: 0,
      max: 500,
      now: 500,
    });
  });

  it('fills the bar completely when the meter is exhausted with zero used', () => {
    const exhaustedItem: TradeAllowanceItem = {
      id: 'swaps',
      used: 0,
      allowance: 500,
      kind: 'currency',
      exhausted: true,
    };

    const { getByTestId } = renderTradeAllowanceRow(exhaustedItem);

    const fill = getByTestId(
      MemberPricingOnTradesTestIds.PROGRESS_FILL('swaps'),
    );

    expect(getFlattenedStyle(fill.props.style)).toEqual(
      expect.objectContaining({ width: '100%' }),
    );
  });
});
