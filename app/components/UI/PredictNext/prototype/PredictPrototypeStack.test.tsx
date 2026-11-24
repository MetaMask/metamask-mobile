import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import PredictPrototypeStack from './PredictPrototypeStack';

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'LOW',
}));
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'NONE',
}));
jest.mock('../../SocialFeed/components/TraderAvatar', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <MockView testID={testID} />,
  };
});

const renderStack = () =>
  render(
    <NavigationContainer>
      <PredictPrototypeStack />
    </NavigationContainer>,
  );

describe('PredictPrototypeStack', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the signed-out feed with onboarding below trending', () => {
    renderStack();

    expect(screen.getByText('Predictions')).toBeOnTheScreen();
    expect(screen.queryByText('Available balance')).toBeNull();
    expect(screen.getByText('Start predicting')).toBeOnTheScreen();
    expect(screen.getByText('Quick security check')).toBeOnTheScreen();
    expect(screen.queryByText('Get started in a few steps')).toBeNull();
  });

  it('introduces Predictions once on the first visit', async () => {
    jest.useFakeTimers();
    renderStack();

    await act(async () => {
      jest.advanceTimersByTime(700);
    });

    expect(screen.getByText('Predict what happens next')).toBeOnTheScreen();
    expect(screen.getByText('Not now')).toBeOnTheScreen();
  });

  it('lays the feed out like the Figma frame', () => {
    renderStack();

    expect(screen.getByText('Panthers vs Eagles')).toBeOnTheScreen();
    expect(screen.getByText('BTC Up/Down - 5 Min')).toBeOnTheScreen();
    expect(screen.getByText('ETH Up/Down - 5 Min')).toBeOnTheScreen();
    ['Trending', 'Football', 'Crypto'].forEach((title) =>
      expect(screen.getAllByText(title).length).toBeGreaterThan(0),
    );
    expect(screen.getByText('Basketball')).toBeOnTheScreen();
    expect(screen.getByText('BTC Up/Down - 5 min')).toBeOnTheScreen();
    expect(screen.getByText('Bills vs Rams')).toBeOnTheScreen();
  });

  it('shows live odds, volume and comment counts on the cards', () => {
    renderStack();

    expect(screen.getByTestId('feed-pill-car-phi-0')).toBeOnTheScreen();
    expect(screen.getAllByTestId('feed-pill-btc-15m-0')[0]).toBeOnTheScreen();
    expect(
      screen.getAllByTestId('feed-comments-button').length,
    ).toBeGreaterThanOrEqual(7);
    expect(screen.getAllByTestId('pulse-dot-error').length).toBeGreaterThan(0);
  });

  it('opens the comments sheet from a card footer', async () => {
    renderStack();

    fireEvent.press(screen.getAllByTestId('feed-comments-button')[0]);
    await act(async () => undefined);

    expect(screen.getByTestId('comments-sheet')).toBeOnTheScreen();
    expect(screen.getByText('Comments')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('Add a comment')).toBeOnTheScreen();
    expect(screen.getByTestId('comments-open-social')).toBeOnTheScreen();
  });

  it('opens a game event from the football card', async () => {
    renderStack();

    fireEvent.press(screen.getAllByText('Bills vs Rams')[0]);
    await act(async () => undefined);

    expect(screen.getByText('Moneyline')).toBeOnTheScreen();
  });

  it('opens crypto from the trending chart card', async () => {
    renderStack();

    expect(screen.queryByText('Ethereum up or down')).toBeNull();
    fireEvent.press(screen.getAllByTestId('feed-crypto-card-btc-15m')[0]);
    await act(async () => undefined);

    expect(screen.getByText('Outcomes')).toBeOnTheScreen();
  });

  it('drills into sports from the Football chip and filters by league', async () => {
    renderStack();

    fireEvent.press(screen.getAllByText('Football')[0]);
    await act(async () => undefined);

    expect(screen.getByText('Galatasaray vs. Barcelona')).toBeOnTheScreen();
    fireEvent.press(screen.getAllByText('MLB')[0]);
    await act(async () => undefined);

    expect(screen.getByText('Dodgers vs. Brewers')).toBeOnTheScreen();
    expect(screen.queryByText('Galatasaray vs. Barcelona')).toBeNull();
  });

  it('shows an empty category page when a category has no markets', async () => {
    renderStack();

    fireEvent.press(screen.getByText('Finance'));
    await act(async () => undefined);

    expect(screen.getByText('No markets yet')).toBeOnTheScreen();
  });

  it('gates a buy behind the get started sheet when signed out', async () => {
    renderStack();

    fireEvent.press(screen.getByTestId('feed-pill-car-phi-0'));
    await act(async () => undefined);

    expect(
      screen.getByText('A few quick steps to trade predictions'),
    ).toBeOnTheScreen();
  });
});
