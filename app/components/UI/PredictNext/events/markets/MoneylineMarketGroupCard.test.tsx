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
  PredictGame,
  PredictGameSelection,
  PredictHexColor,
  PredictHttpsUrl,
  PredictMarket,
  PredictMarketStatus,
  PredictTimestamp,
} from '../../types';
import { MoneylineMarketGroupCard } from './MoneylineMarketGroupCard';
import { MoneylineMarketGroupCardTestIds as TestIds } from './MoneylineMarketGroupCard.testIds';

const GROUP = 'KXNFL1Q-26OCT29CARGB:moneyline';
// Team colors come from the Venue, not design tokens.
const CAROLINA_BLUE = `#${'0085CA'}`;
// The logo is decorative and hidden from assistive technology.
const HIDDEN = { includeHiddenElements: true };

const createMarket = ({
  id,
  label,
  askPrice,
  gameSelection,
  displayOrder,
  status = 'active',
}: {
  id: string;
  label: string;
  askPrice?: string;
  gameSelection?: PredictGameSelection;
  displayOrder: number;
  status?: PredictMarketStatus;
}): PredictMarket => ({
  id: id as PredictEntityId,
  question: `Will ${label} win the 1st quarter?`,
  status,
  group: { key: GROUP, groupType: 'choice', displayOrder },
  outcomes: [
    {
      id: `${id}:yes` as PredictEntityId,
      side: 'yes',
      label,
      askPrice: askPrice as PredictDecimal | undefined,
      gameSelection,
    },
    {
      id: `${id}:no` as PredictEntityId,
      side: 'no',
      label,
    },
  ],
});

const away = createMarket({
  id: 'Q1-CAR',
  label: 'Carolina',
  askPrice: '0.36',
  gameSelection: 'away',
  displayOrder: 0,
});
const tie = createMarket({
  id: 'Q1-TIE',
  label: 'Tie',
  askPrice: '0.07',
  displayOrder: 1,
});
const home = createMarket({
  id: 'Q1-GB',
  label: 'Green Bay',
  askPrice: '0.65',
  gameSelection: 'home',
  displayOrder: 2,
});

const game: PredictGame = {
  status: 'scheduled',
  awayTeam: {
    name: 'Carolina Panthers',
    abbreviation: 'CAR',
    logoUrl: 'https://example.com/car.png' as PredictHttpsUrl,
    primaryColor: CAROLINA_BLUE as PredictHexColor,
  },
  homeTeam: { name: 'Green Bay Packers', abbreviation: 'GB' },
  observedAt: '2026-10-29T12:00:00Z' as PredictTimestamp,
};

const renderCard = (markets: readonly PredictMarket[], onOrder = jest.fn()) =>
  render(
    <MoneylineMarketGroupCard
      groupKey={GROUP}
      markets={markets}
      game={game}
      onOrder={onOrder}
    />,
  );

/** Row test IDs in rendered order. */
const rowIds = (markets: readonly PredictMarket[]) => {
  const ids = markets.map((market) =>
    TestIds.row(GROUP, market.id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  return within(screen.getByTestId(TestIds.card(GROUP)))
    .getAllByTestId(new RegExp(`^(${ids.join('|')})$`))
    .map((row) => row.props.testID);
};

describe('MoneylineMarketGroupCard', () => {
  it('renders a full-game moneyline as two Team rows, away first', () => {
    renderCard([home, away]);

    expect(rowIds([home, away])).toEqual([
      TestIds.row(GROUP, away.id),
      TestIds.row(GROUP, home.id),
    ]);
    expect(screen.getByTestId(TestIds.row(GROUP, away.id))).toHaveTextContent(
      /Carolina Panthers.*36¢/,
    );
    expect(screen.getByTestId(TestIds.row(GROUP, home.id))).toHaveTextContent(
      /Green Bay Packers.*65¢/,
    );
  });

  it('renders a period moneyline with the tie between the Teams', () => {
    renderCard([home, tie, away]);

    expect(rowIds([home, tie, away])).toEqual([
      TestIds.row(GROUP, away.id),
      TestIds.row(GROUP, tie.id),
      TestIds.row(GROUP, home.id),
    ]);
    expect(screen.getByTestId(TestIds.row(GROUP, tie.id))).toHaveTextContent(
      /Tie.*7¢/,
    );
  });

  it('shows Team logos, falling back to the abbreviation', () => {
    renderCard([away, tie, home]);

    expect(
      screen.getByTestId(TestIds.logo(GROUP, away.id), HIDDEN),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TestIds.logoFallback(GROUP, home.id), HIDDEN),
    ).toHaveTextContent('GB');
    expect(
      screen.getByTestId(TestIds.logoFallback(GROUP, tie.id), HIDDEN),
    ).toBeOnTheScreen();
  });

  it('colors each row by its Team, with a neutral tie', () => {
    renderCard([away, tie, home]);

    expect(screen.getByTestId(TestIds.line(GROUP, away.id))).toHaveStyle({
      width: '36%',
      backgroundColor: CAROLINA_BLUE,
    });
    expect(screen.getByText('36¢')).toHaveStyle({ color: CAROLINA_BLUE });
    // Green Bay sends no color: the theme's home fallback.
    expect(screen.getByTestId(TestIds.line(GROUP, home.id))).toHaveStyle({
      backgroundColor: lightTheme.colors.success.default,
    });
    expect(screen.getByTestId(TestIds.line(GROUP, tie.id))).toHaveStyle({
      backgroundColor: lightTheme.colors.text.alternative,
    });
  });

  it('orders the yes side of the pressed option', () => {
    const onOrder = jest.fn();
    renderCard([away, home], onOrder);

    fireEvent.press(screen.getByLabelText('Green Bay Packers, 65¢'));

    expect(onOrder).toHaveBeenCalledWith(home, home.outcomes[0]);
  });

  it('disables an option that cannot be traded', () => {
    const onOrder = jest.fn();
    const closed = { ...away, status: 'closed' as const };
    renderCard([closed, home], onOrder);

    fireEvent.press(screen.getByTestId(TestIds.price(GROUP, away.id)));

    expect(onOrder).not.toHaveBeenCalled();
  });

  it('shows a dash and an unavailable price label without an Ask Price', () => {
    const unpriced = createMarket({
      id: 'Q1-CAR',
      label: 'Carolina',
      gameSelection: 'away',
      displayOrder: 0,
    });
    renderCard([unpriced, home]);

    expect(screen.getByTestId(TestIds.price(GROUP, away.id))).toHaveTextContent(
      '—',
    );
    expect(
      screen.getByLabelText('Carolina Panthers, price unavailable'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(TestIds.line(GROUP, away.id))).toBeNull();
  });

  it('renders nothing without an option', () => {
    renderCard([]);

    expect(screen.queryByTestId(TestIds.card(GROUP))).toBeNull();
  });
});
