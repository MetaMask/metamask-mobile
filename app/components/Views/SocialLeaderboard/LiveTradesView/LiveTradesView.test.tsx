import React from 'react';
import { FilterButtonGroup } from '@metamask/design-system-react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { getSubnavPillTestId } from '../shell/SubnavPills';
import LiveTradesView from './LiveTradesView';
import { LiveTradesViewSelectorsIDs } from './LiveTradesView.testIds';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('LiveTradesView', () => {
  it('renders the Live trades category pills above an empty scroll surface', () => {
    renderWithProvider(<LiveTradesView />);

    expect(
      screen.getByTestId(LiveTradesViewSelectorsIDs.SCROLL_VIEW),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSubnavPillTestId('memecoins')),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(getSubnavPillTestId('perps'))).toBeOnTheScreen();
    expect(screen.getByTestId(getSubnavPillTestId('stocks'))).toBeOnTheScreen();
    expect(screen.getByTestId(getSubnavPillTestId('whales'))).toBeOnTheScreen();
  });

  it('selects a Live trades category pill', () => {
    const { UNSAFE_getByType } = renderWithProvider(<LiveTradesView />);

    fireEvent.press(screen.getByTestId(getSubnavPillTestId('stocks')));

    expect(UNSAFE_getByType(FilterButtonGroup).props.value).toBe('stocks');
  });
});
