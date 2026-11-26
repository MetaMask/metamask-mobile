import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictMarket,
  PredictOutcome,
} from '../../types';
import { strings } from '../../../../../../locales/i18n';
import { MarketStandardCard } from './MarketStandardCard';
import { MarketStandardCardTestIds } from './MarketStandardCard.testIds';

const createOutcome = (
  side: 'yes' | 'no',
  askPrice?: string,
  label = side === 'yes' ? 'Yes' : 'No',
): PredictOutcome => ({
  id: `${side}-outcome` as PredictEntityId,
  side,
  label,
  askPrice: askPrice as PredictDecimal | undefined,
});

const createMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1' as PredictEntityId,
  question: 'Will the Dodgers win?',
  status: 'active',
  volume: '3200000',
  outcomes: [
    createOutcome('yes', '0.38', 'Dodgers'),
    createOutcome('no', '0.62'),
  ],
  ...overrides,
});

const renderMarketCard = (
  market: PredictMarket,
  {
    onRulesPress = jest.fn(),
    onOrder,
  }: {
    onRulesPress?: (market: PredictMarket) => void;
    onOrder?: (market: PredictMarket, outcome: PredictOutcome) => void;
  } = {},
) =>
  render(
    <MarketStandardCard
      market={market}
      onRulesPress={onRulesPress}
      onOrder={onOrder}
    />,
  );

const yes = strings('predict_next.portfolio.outcome_side.yes');
const no = strings('predict_next.portfolio.outcome_side.no');

describe('MarketStandardCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('titles the card with the Yes Outcome label and shows a Yes and a No row', () => {
    const market = createMarket();

    renderMarketCard(market);

    expect(
      screen.getByTestId(MarketStandardCardTestIds.title(market.id)),
    ).toHaveTextContent('Dodgers');
    const yesRow = within(
      screen.getByTestId(MarketStandardCardTestIds.row(market.id, 'yes')),
    );
    const noRow = within(
      screen.getByTestId(MarketStandardCardTestIds.row(market.id, 'no')),
    );
    expect(yesRow.getByText(yes)).toBeOnTheScreen();
    expect(yesRow.getByText('38¢')).toBeOnTheScreen();
    expect(noRow.getByText(no)).toBeOnTheScreen();
    expect(noRow.getByText('62¢')).toBeOnTheScreen();
  });

  it('labels the rows with the translated outcome sides', () => {
    renderMarketCard(createMarket());

    expect(yes).toBe('Yes');
    expect(no).toBe('No');
    expect(screen.getByText('Yes')).toBeOnTheScreen();
    expect(screen.getByText('No')).toBeOnTheScreen();
  });

  it('draws each quote bar at its Ask Price, Yes in green and No in red', () => {
    const market = createMarket();

    renderMarketCard(market);

    expect(
      screen.getByTestId(MarketStandardCardTestIds.line(market.id, 'yes')),
    ).toHaveStyle({
      width: '38%',
      backgroundColor: lightTheme.colors.success.default,
    });
    expect(
      screen.getByTestId(MarketStandardCardTestIds.line(market.id, 'no')),
    ).toHaveStyle({
      width: '62%',
      backgroundColor: lightTheme.colors.error.default,
    });
    expect(screen.getByText('38¢')).toHaveStyle({
      color: lightTheme.colors.success.default,
    });
    expect(screen.getByText('62¢')).toHaveStyle({
      color: lightTheme.colors.error.default,
    });
  });

  it('does not show the Market volume or a percentage on the card', () => {
    renderMarketCard(createMarket());

    expect(screen.queryByText(/Vol\.$/)).not.toBeOnTheScreen();
    expect(screen.queryByText('38%')).not.toBeOnTheScreen();
  });

  it('preserves a zero Ask Price', () => {
    const market = createMarket({
      outcomes: [
        createOutcome('yes', '0', 'Dodgers'),
        createOutcome('no', '1'),
      ],
    });

    renderMarketCard(market);

    expect(screen.getByText('0¢')).toBeOnTheScreen();
    expect(
      screen.getByTestId(MarketStandardCardTestIds.line(market.id, 'yes')),
    ).toHaveStyle({ width: '0%' });
  });

  it('shows a dash and no quote bar for a missing Ask Price', () => {
    const market = createMarket({
      outcomes: [
        createOutcome('yes', undefined, 'Dodgers'),
        createOutcome('no'),
      ],
    });

    renderMarketCard(market);

    expect(
      screen.queryByTestId(MarketStandardCardTestIds.line(market.id, 'yes')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(MarketStandardCardTestIds.line(market.id, 'no')),
    ).not.toBeOnTheScreen();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('finds Outcomes by side when the backend tuple order changes', () => {
    const market = createMarket({
      outcomes: [
        createOutcome('no', '0.65'),
        createOutcome('yes', '0.35', 'Dodgers'),
      ],
    });

    renderMarketCard(market);

    expect(screen.getByText('Dodgers')).toBeOnTheScreen();
    expect(
      within(
        screen.getByTestId(MarketStandardCardTestIds.row(market.id, 'yes')),
      ).getByText('35¢'),
    ).toBeOnTheScreen();
    expect(
      within(
        screen.getByTestId(MarketStandardCardTestIds.row(market.id, 'no')),
      ).getByText('65¢'),
    ).toBeOnTheScreen();
  });

  it('orders the Outcome of the pressed row', () => {
    const market = createMarket();
    const onOrder = jest.fn();

    renderMarketCard(market, { onOrder });
    fireEvent.press(
      screen.getByTestId(MarketStandardCardTestIds.yesButton(market.id)),
    );
    fireEvent.press(
      screen.getByTestId(MarketStandardCardTestIds.noButton(market.id)),
    );

    expect(onOrder).toHaveBeenNthCalledWith(1, market, market.outcomes[0]);
    expect(onOrder).toHaveBeenNthCalledWith(2, market, market.outcomes[1]);
  });

  it('names the Market, side, and price in each price button label', () => {
    const market = createMarket();

    renderMarketCard(market);

    expect(
      screen.getByTestId(MarketStandardCardTestIds.yesButton(market.id)),
    ).toHaveProp(
      'accessibilityLabel',
      strings('predict_next.event.standard_outcome_accessibility_label', {
        title: 'Dodgers',
        outcome: yes,
        price: '38¢',
      }),
    );
  });

  it('disables the price of an Outcome that cannot be traded', () => {
    const market = createMarket({ status: 'closed' });
    const onOrder = jest.fn();

    renderMarketCard(market, { onOrder });
    const yesButton = screen.getByTestId(
      MarketStandardCardTestIds.yesButton(market.id),
    );
    fireEvent.press(yesButton);

    expect(yesButton.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    expect(onOrder).not.toHaveBeenCalled();
  });

  it('emits the market rules intent when the title is pressed', () => {
    const market = createMarket({ rules: 'Primary rule.' });
    const onRulesPress = jest.fn();

    renderMarketCard(market, { onRulesPress });
    const title = screen.getByTestId(
      MarketStandardCardTestIds.title(market.id),
    );

    expect(title).toHaveProp('accessibilityRole', 'button');
    expect(title).toHaveProp(
      'accessibilityHint',
      strings('predict.rules.market_accessibility_label'),
    );
    fireEvent.press(title);

    expect(onRulesPress).toHaveBeenCalledWith(market);
  });

  it('leaves the title inert when rules are absent', () => {
    const market = createMarket({ rules: undefined });
    const onRulesPress = jest.fn();

    renderMarketCard(market, { onRulesPress });
    const title = screen.getByTestId(
      MarketStandardCardTestIds.title(market.id),
    );

    expect(title).not.toHaveProp('accessibilityRole', 'button');
    fireEvent.press(title);

    expect(onRulesPress).not.toHaveBeenCalled();
  });
});
