import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import LiveTradesView from './LiveTradesView';
import { LiveTradesViewSelectorsIDs } from './LiveTradesView.testIds';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('LiveTradesView', () => {
  it('renders a single Live stream toggle above an empty scroll surface', () => {
    renderWithProvider(<LiveTradesView />);

    expect(
      screen.getByTestId(LiveTradesViewSelectorsIDs.SCROLL_VIEW),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(LiveTradesViewSelectorsIDs.STREAM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.live_stream.live'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText('social_leaderboard.feed.live_stream.paused'),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON),
    ).toBeOnTheScreen();
  });

  it('toggles from Live to Paused without calling onOpenFilters', () => {
    const onOpenFilters = jest.fn();
    renderWithProvider(<LiveTradesView onOpenFilters={onOpenFilters} />);

    fireEvent.press(
      screen.getByTestId(LiveTradesViewSelectorsIDs.STREAM_BUTTON),
    );

    expect(
      screen.getByText('social_leaderboard.feed.live_stream.paused'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText('social_leaderboard.feed.live_stream.live'),
    ).not.toBeOnTheScreen();
    expect(onOpenFilters).not.toHaveBeenCalled();
  });

  it('opens filters from the filter icon', () => {
    const onOpenFilters = jest.fn();
    renderWithProvider(<LiveTradesView onOpenFilters={onOpenFilters} />);

    fireEvent.press(
      screen.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON),
    );

    expect(onOpenFilters).toHaveBeenCalledTimes(1);
  });

  it('highlights the filter icon when filters are active', () => {
    const { rerender } = renderWithProvider(
      <LiveTradesView isFilterActive={false} />,
    );

    const inactiveStyle = StyleSheet.flatten(
      screen.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON).props.style,
    );

    rerender(<LiveTradesView isFilterActive />);

    const activeStyle = StyleSheet.flatten(
      screen.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON).props.style,
    );

    expect(activeStyle?.backgroundColor).not.toBe(
      inactiveStyle?.backgroundColor,
    );
  });

  it('toggles from Paused back to Live on a second press', () => {
    renderWithProvider(<LiveTradesView />);

    fireEvent.press(
      screen.getByTestId(LiveTradesViewSelectorsIDs.STREAM_BUTTON),
    );
    fireEvent.press(
      screen.getByTestId(LiveTradesViewSelectorsIDs.STREAM_BUTTON),
    );

    expect(
      screen.getByText('social_leaderboard.feed.live_stream.live'),
    ).toBeOnTheScreen();
  });
});
