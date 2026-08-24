import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictMarket,
  PredictOutcome,
  PredictSettlementSource,
} from '../../types';
import { MarketStandardCard } from './MarketStandardCard';
import { MarketStandardCardTestIds } from './MarketStandardCard.testIds';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

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

describe('MarketStandardCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Yes Outcome label, Volume, percentage, and Ask Prices', () => {
    const market = createMarket();

    render(<MarketStandardCard market={market} />);

    expect(
      screen.getByTestId(MarketStandardCardTestIds.title(market.id)),
    ).toHaveTextContent('Dodgers');
    expect(
      screen.getByTestId(MarketStandardCardTestIds.volume(market.id)),
    ).toHaveTextContent('$3.2M Vol.');
    expect(
      screen.getByTestId(MarketStandardCardTestIds.percentage(market.id)),
    ).toHaveTextContent('38%');
    expect(screen.getByText('Yes · 38¢')).toBeOnTheScreen();
    expect(screen.getByText('No · 62¢')).toBeOnTheScreen();
  });

  it('uses the Yes percentage for complementary split bar segments', () => {
    const market = createMarket();

    render(<MarketStandardCard market={market} />);

    expect(
      screen.getByTestId(MarketStandardCardTestIds.barYes(market.id)),
    ).toHaveStyle({
      backgroundColor: lightTheme.colors.success.default,
      flex: 38,
    });
    expect(
      screen.getByTestId(MarketStandardCardTestIds.barNo(market.id)),
    ).toHaveStyle({
      backgroundColor: lightTheme.colors.error.default,
      flex: 62,
    });
  });

  it('uses semantic text colors for both Outcome controls', () => {
    const market = createMarket();

    render(<MarketStandardCard market={market} />);

    expect(screen.getByText('Yes · 38¢')).toHaveStyle({
      color: lightTheme.colors.success.default,
    });
    expect(screen.getByText('No · 62¢')).toHaveStyle({
      color: lightTheme.colors.error.default,
    });
  });

  it('preserves a zero Ask Price and percentage', () => {
    const market = createMarket({
      outcomes: [
        createOutcome('yes', '0', 'Dodgers'),
        createOutcome('no', '1'),
      ],
    });

    render(<MarketStandardCard market={market} />);

    expect(screen.getByText('Yes · 0¢')).toBeOnTheScreen();
    expect(
      screen.getByTestId(MarketStandardCardTestIds.percentage(market.id)),
    ).toHaveTextContent('0%');
  });

  it('omits missing Volume, percentage, bar, and Ask Price values', () => {
    const market = createMarket({
      volume: undefined,
      outcomes: [
        createOutcome('yes', undefined, 'Dodgers'),
        createOutcome('no'),
      ],
    });

    render(<MarketStandardCard market={market} />);

    expect(
      screen.queryByTestId(MarketStandardCardTestIds.volume(market.id)),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(MarketStandardCardTestIds.percentage(market.id)),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(MarketStandardCardTestIds.bar(market.id)),
    ).not.toBeOnTheScreen();
    expect(screen.getByText('Yes')).toBeOnTheScreen();
    expect(screen.getByText('No')).toBeOnTheScreen();
    expect(screen.queryByText(/0¢/)).not.toBeOnTheScreen();
  });

  it('finds Outcomes by side when the backend tuple order changes', () => {
    const market = createMarket({
      outcomes: [
        createOutcome('no', '0.65'),
        createOutcome('yes', '0.35', 'Dodgers'),
      ],
    });

    render(<MarketStandardCard market={market} />);

    expect(screen.getByText('Dodgers')).toBeOnTheScreen();
    expect(screen.getByText('Yes · 35¢')).toBeOnTheScreen();
    expect(screen.getByText('No · 65¢')).toBeOnTheScreen();
  });

  it('keeps both Outcome controls enabled and inert', () => {
    const market = createMarket();

    render(<MarketStandardCard market={market} />);
    const yesButton = screen.getByTestId(
      MarketStandardCardTestIds.yesButton(market.id),
    );
    const noButton = screen.getByTestId(
      MarketStandardCardTestIds.noButton(market.id),
    );
    fireEvent.press(yesButton);
    fireEvent.press(noButton);

    expect(yesButton.props.accessibilityState).toEqual({ disabled: false });
    expect(noButton.props.accessibilityState).toEqual({ disabled: false });
    expect(
      screen.getByTestId(MarketStandardCardTestIds.card(market.id)),
    ).toBeOnTheScreen();
  });

  it('opens the rules sheet with primary and secondary rules in order', () => {
    const market = createMarket({
      rules: 'Primary rule.\n\nSecondary rule.',
    });

    render(<MarketStandardCard market={market} />);

    fireEvent.press(
      screen.getByTestId(MarketStandardCardTestIds.rulesButton(market.id)),
    );

    expect(
      screen.getByTestId(MarketStandardCardTestIds.rulesSheet(market.id)),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MarketStandardCardTestIds.rulesText(market.id)),
    ).toHaveTextContent('Primary rule.\n\nSecondary rule.');
    expect(screen.getByText('Market rules')).toBeOnTheScreen();
  });

  it('renders settlement sources above the market rules', () => {
    const market = createMarket({ rules: 'Primary rule.' });
    const settlementSources: PredictSettlementSource[] = [
      { name: 'the Governing League', url: 'https://www.nfl.com/' },
      { name: 'ESPN', url: 'https://www.espn.com/' },
    ];

    render(
      <MarketStandardCard
        market={market}
        settlementSources={settlementSources}
      />,
    );

    fireEvent.press(
      screen.getByTestId(MarketStandardCardTestIds.rulesButton(market.id)),
    );

    expect(
      screen.getByTestId(MarketStandardCardTestIds.rulesSources(market.id)),
    ).toHaveTextContent('Outcome verified from the Governing League and ESPN.');
  });

  it('opens the selected settlement source URL', () => {
    const market = createMarket({ rules: 'Primary rule.' });
    const settlementSources: PredictSettlementSource[] = [
      { name: 'the Governing League', url: 'https://www.nfl.com/' },
      { name: 'ESPN', url: 'https://www.espn.com/' },
    ];

    render(
      <MarketStandardCard
        market={market}
        settlementSources={settlementSources}
      />,
    );

    fireEvent.press(
      screen.getByTestId(MarketStandardCardTestIds.rulesButton(market.id)),
    );
    fireEvent.press(
      screen.getByTestId(
        MarketStandardCardTestIds.rulesSourceLink(market.id, 1),
      ),
    );

    expect(Linking.openURL).toHaveBeenCalledWith('https://www.espn.com/');
  });

  it('closes the rules sheet from the header close control', () => {
    const market = createMarket({ rules: 'Primary rule.' });

    render(<MarketStandardCard market={market} />);
    fireEvent.press(
      screen.getByTestId(MarketStandardCardTestIds.rulesButton(market.id)),
    );
    fireEvent.press(
      screen.getByTestId(MarketStandardCardTestIds.rulesCloseButton(market.id)),
    );

    expect(
      screen.queryByTestId(MarketStandardCardTestIds.rulesSheet(market.id)),
    ).not.toBeOnTheScreen();
  });

  it('hides the rules control and sheet when rules are absent', () => {
    const market = createMarket({ rules: undefined });

    render(<MarketStandardCard market={market} />);

    expect(
      screen.queryByTestId(MarketStandardCardTestIds.rulesButton(market.id)),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(MarketStandardCardTestIds.rulesSheet(market.id)),
    ).not.toBeOnTheScreen();
  });
});
