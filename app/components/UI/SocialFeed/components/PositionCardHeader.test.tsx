import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PositionCardHeader, {
  POSITION_CARD_HEADER_PLACEHOLDER_TEST_ID,
  type PositionCardHeaderProps,
} from './PositionCardHeader';

const HIDDEN = { includeHiddenElements: true };

const AVATAR: PositionCardHeaderProps['avatar'] = {
  positionId: 'pos-eth',
  chain: 'hyperliquid',
  tokenAddress: '',
  tokenImageUrl: null,
  tokenSymbol: 'ETH',
};

const renderHeader = (
  overrides: Partial<PositionCardHeaderProps> = {},
): ReturnType<typeof renderWithProvider> =>
  renderWithProvider(
    <PositionCardHeader
      layout="open"
      avatar={AVATAR}
      symbol="ETH"
      side="buy"
      pnlLabel="+12.5%"
      pnlValueLabel="+$1,250"
      subtitleLabel="$3,400"
      isPnlPositive
      {...overrides}
    />,
  );

describe('PositionCardHeader', () => {
  it('renders the price and P&L without placeholders once priced', () => {
    renderHeader();

    expect(screen.getByText('$3,400')).toBeOnTheScreen();
    expect(screen.getByText('+$1,250')).toBeOnTheScreen();
    expect(screen.getByText('+12.5%')).toBeOnTheScreen();
    expect(
      screen.queryAllByTestId(POSITION_CARD_HEADER_PLACEHOLDER_TEST_ID, HIDDEN),
    ).toHaveLength(0);
  });

  it('reserves the price and both P&L lines before prices load', () => {
    renderHeader({
      pnlLabel: '',
      pnlValueLabel: undefined,
      subtitleLabel: undefined,
    });

    expect(
      screen.getAllByTestId(POSITION_CARD_HEADER_PLACEHOLDER_TEST_ID, HIDDEN),
    ).toHaveLength(3);
  });

  it('reads the live price as one label', () => {
    renderHeader({ live: { reduceMotion: false }, testID: 'header' });

    expect(screen.getByLabelText('$3,400')).toBeOnTheScreen();
  });

  it('hides the reserved lines from screen readers', () => {
    renderHeader({ subtitleLabel: undefined });

    const placeholder = screen.getByTestId(
      POSITION_CARD_HEADER_PLACEHOLDER_TEST_ID,
      HIDDEN,
    );

    expect(placeholder.props.accessibilityElementsHidden).toBe(true);
    expect(placeholder.props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
  });
});
