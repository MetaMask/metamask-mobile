import React from 'react';
import { FilterButtonGroup } from '@metamask/design-system-react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import LiveTradesView from './LiveTradesView';
import { LiveTradesViewSelectorsIDs } from './LiveTradesView.testIds';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('LiveTradesView', () => {
  it('renders Paused and Live controls above an empty scroll surface', () => {
    renderWithProvider(<LiveTradesView />);

    expect(
      screen.getByTestId(LiveTradesViewSelectorsIDs.SCROLL_VIEW),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(LiveTradesViewSelectorsIDs.PAUSED_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(LiveTradesViewSelectorsIDs.LIVE_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON),
    ).toBeOnTheScreen();
  });

  it('defaults the stream control to Live', () => {
    const { UNSAFE_getByType } = renderWithProvider(<LiveTradesView />);

    expect(UNSAFE_getByType(FilterButtonGroup).props.value).toBe('live');
  });

  it('selects Paused without calling onOpenFilters', () => {
    const onOpenFilters = jest.fn();
    const { UNSAFE_getByType } = renderWithProvider(
      <LiveTradesView onOpenFilters={onOpenFilters} />,
    );

    fireEvent.press(
      screen.getByTestId(LiveTradesViewSelectorsIDs.PAUSED_BUTTON),
    );

    expect(UNSAFE_getByType(FilterButtonGroup).props.value).toBe('paused');
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
});
