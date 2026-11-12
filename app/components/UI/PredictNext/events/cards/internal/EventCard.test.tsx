import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictVenueId,
} from '../../../types';
import { EventCard } from './EventCard';

const outcome = (side: 'yes' | 'no', askPrice?: string): PredictOutcome => ({
  id: `${side}-outcome` as PredictEntityId,
  side,
  label: side === 'yes' ? 'Yes' : 'No',
  askPrice: askPrice as PredictDecimal | undefined,
});

const market = (): PredictMarket => ({
  id: 'market-1' as PredictEntityId,
  question: 'Question',
  status: 'active',
  outcomes: [outcome('yes'), outcome('no')],
});

const event = (): PredictEvent => ({
  id: 'event-1' as PredictEntityId,
  venueId: 'kalshi' as PredictVenueId,
  title: 'Election winner',
  markets: [market()],
});

describe('EventCard primitives', () => {
  it('composes header content', () => {
    render(
      <EventCard.Header>
        <EventCard.Title>Election winner</EventCard.Title>
        <EventCard.Subtitle testID="event-subtitle">
          Closes Jul 2028 · $4.2M
        </EventCard.Subtitle>
      </EventCard.Header>,
    );

    expect(screen.getByText('Election winner')).toBeOnTheScreen();
    expect(screen.getByTestId('event-subtitle')).toHaveTextContent(
      'Closes Jul 2028 · $4.2M',
    );
  });

  it('composes footer metadata and its action', () => {
    const onPress = jest.fn();
    render(
      <EventCard.Footer>
        <EventCard.FooterLeading>
          <EventCard.MetadataTag>Politics</EventCard.MetadataTag>
          <EventCard.Volume value="1500000" />
        </EventCard.FooterLeading>
        <EventCard.MoreMarkets count={2} onPress={onPress} />
      </EventCard.Footer>,
    );

    expect(screen.getByText('Politics')).toBeOnTheScreen();
    expect(screen.getByText('$1.5M Vol')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('+2 more'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('omits absent volume and an empty market action', () => {
    render(
      <EventCard.Footer>
        <EventCard.FooterLeading>
          <EventCard.Volume />
        </EventCard.FooterLeading>
        <EventCard.MoreMarkets count={0} />
      </EventCard.Footer>,
    );

    expect(screen.queryByText(/ Vol$/)).toBeNull();
    expect(screen.queryByText(/more$/)).toBeNull();
  });
});

describe('EventCard.OutcomeRow', () => {
  const renderRow = ({
    askPrice,
    imageUrl,
    onOrder,
    status = 'active',
  }: {
    askPrice?: string;
    imageUrl?: string;
    onOrder?: () => void;
    status?: PredictMarket['status'];
  } = {}) => {
    const value = event();
    const valueMarket = { ...value.markets[0], status };
    const valueOutcome = outcome('yes', askPrice);

    render(
      <EventCard.OutcomeRow
        event={value}
        market={valueMarket}
        outcome={valueOutcome}
        imageUrl={imageUrl}
        onOrder={onOrder}
        testID="predict-next-outcome-event-1-yes"
      />,
    );

    return { value, valueMarket, valueOutcome };
  };

  it('shows the outcome label, Ask Price, and chance without a multiplier', () => {
    renderRow({ askPrice: '0.42' });

    expect(screen.getByText('Yes')).toBeOnTheScreen();
    expect(screen.getByText('42¢')).toBeOnTheScreen();
    expect(screen.queryByText('2.38x')).not.toBeOnTheScreen();
    expect(
      screen.getByTestId('predict-next-outcome-event-1-yes-bar'),
    ).toHaveStyle({ width: '42%' });
  });

  it('draws the chance in a neutral colour', () => {
    renderRow({ askPrice: '0.5' });

    expect(
      screen.getByTestId('predict-next-outcome-event-1-yes-bar'),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.icon.alternative });
  });

  it('labels the price with the Event title, Outcome, and price', () => {
    renderRow({ askPrice: '0.42' });

    expect(screen.getByLabelText('Election winner, Yes 42¢')).toBeOnTheScreen();
  });

  it('shows the avatar image when one is given', () => {
    renderRow({ askPrice: '0.42', imageUrl: 'https://example.com/a.png' });

    expect(
      screen.getByTestId('predict-next-outcome-event-1-yes-avatar-image'),
    ).toBeOnTheScreen();
  });

  it('keeps an empty avatar placeholder without an image', () => {
    renderRow({ askPrice: '0.42' });

    expect(
      screen.getByTestId('predict-next-outcome-event-1-yes-avatar'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('predict-next-outcome-event-1-yes-avatar-image'),
    ).not.toBeOnTheScreen();
  });

  it('omits the chance when Ask Price is missing', () => {
    renderRow();

    expect(
      screen.queryByTestId('predict-next-outcome-event-1-yes-bar'),
    ).toBeNull();
  });

  it('emits the selected Event, Market, and Outcome', () => {
    const onOrder = jest.fn();
    const { value, valueMarket, valueOutcome } = renderRow({
      askPrice: '0.42',
      onOrder,
    });

    fireEvent.press(screen.getByTestId('predict-next-outcome-event-1-yes'));

    expect(onOrder).toHaveBeenCalledWith(value, valueMarket, valueOutcome);
  });

  it('disables the price without an order handler', () => {
    renderRow({ askPrice: '0.42' });

    expect(
      screen.getByTestId('predict-next-outcome-event-1-yes'),
    ).toBeDisabled();
  });

  it('disables the price when the Market is not active', () => {
    renderRow({ askPrice: '0.42', onOrder: jest.fn(), status: 'closed' });

    expect(
      screen.getByTestId('predict-next-outcome-event-1-yes'),
    ).toBeDisabled();
  });
});

describe('EventCard.HeaderRow', () => {
  it('lays out leading and trailing content above a dashed divider', () => {
    render(
      <EventCard.HeaderRow testID="header">
        <EventCard.HeaderRow.Title testID="header-title">
          Panthers vs. Eagles
        </EventCard.HeaderRow.Title>
        <EventCard.HeaderRow.Meta testID="header-meta">
          NFL
        </EventCard.HeaderRow.Meta>
      </EventCard.HeaderRow>,
    );

    const title = screen.getByTestId('header-title');
    const meta = screen.getByTestId('header-meta');
    expect(title).toHaveTextContent('Panthers vs. Eagles');
    expect(title).toHaveProp('numberOfLines', 1);
    expect(meta).toHaveTextContent('NFL');
    expect(meta).toHaveStyle({ color: lightTheme.colors.text.alternative });
    expect(screen.getByTestId('header-row')).toHaveStyle({
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    });
    const divider = screen.getByTestId('header-divider');
    expect(divider).toHaveStyle({
      borderStyle: 'dashed',
      borderColor: lightTheme.colors.border.muted,
    });
  });

  it('keeps the Title at 60% of the row or more, so a long Meta truncates beside it', () => {
    render(
      <EventCard.HeaderRow>
        <EventCard.HeaderRow.Title testID="header-title">
          Los Angeles Lakers vs. Boston Celtics
        </EventCard.HeaderRow.Title>
        <EventCard.HeaderRow.Meta testID="header-meta">
          National Basketball Association Regular Season
        </EventCard.HeaderRow.Meta>
      </EventCard.HeaderRow>,
    );

    const title = screen.getByTestId('header-title');
    expect(title).toHaveStyle({ flexGrow: 1, minWidth: '60%' });
    expect(title).toHaveProp('numberOfLines', 1);
    const meta = screen.getByTestId('header-meta');
    expect(meta).toHaveStyle({ flexShrink: 1 });
    expect(meta).not.toHaveStyle({ maxWidth: expect.anything() });
    expect(meta).toHaveProp('numberOfLines', 1);
  });

  it('accepts any element on either side', () => {
    render(
      <EventCard.HeaderRow>
        <EventCard.HeaderRow.Meta>Sports</EventCard.HeaderRow.Meta>
        <EventCard.MetadataTag testID="trailing-tag">
          LIVE
        </EventCard.MetadataTag>
      </EventCard.HeaderRow>,
    );

    expect(screen.getByText('Sports')).toBeOnTheScreen();
    expect(screen.getByTestId('trailing-tag')).toHaveTextContent('LIVE');
  });
});
