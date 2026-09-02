import React from 'react';
import { render } from '@testing-library/react-native';
import MemberPricingOnTrades from './MemberPricingOnTrades';
import TradeAllowanceRow from './TradeAllowanceRow';
import { MemberPricingOnTradesTestIds } from './MemberPricingOnTrades.testIds';
import {
  MOCK_TRADE_ALLOWANCES,
  type TradeAllowanceItem,
} from '../../ProHub.constants';
import { strings } from '../../../../../../locales/i18n';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: unknown[]) => ({}),
  }),
}));

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
  it('renders the section title from i18n', () => {
    const { getByTestId } = renderMemberPricingOnTrades();

    const title = getByTestId(MemberPricingOnTradesTestIds.TITLE);

    expect(title).toHaveTextContent(
      strings('pro_hub.member_pricing.title'),
    );
  });

  it('renders a row and progress bar for each mock trade allowance', () => {
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

    expect(getFlattenedStyle(fill.props.style)).toEqual(
      expect.objectContaining({ width: '100%' }),
    );
  });
});
