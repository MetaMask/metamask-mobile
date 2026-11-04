import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import ContextualExploreTabBar from './ContextualExploreTabBar';
import ContextualHomeSectionOverlay from './ContextualHomeSectionOverlay';
import ContextualMoneyTabBar from './ContextualMoneyTabBar';
import {
  enterExploreSection,
  enterMoneySection,
  exitContextualSection,
  getContextualNavState,
  setContextualTab,
} from './contextualSection';

jest.mock('../../../../util/haptics');

describe('contextual Money and Explore footers', () => {
  const onHomePress = jest.fn();

  afterEach(() => {
    act(() => {
      exitContextualSection();
    });
    onHomePress.mockClear();
  });

  it('selects Payments and marks it selected', () => {
    enterMoneySection();

    const { getByTestId } = renderWithProvider(
      <ContextualMoneyTabBar onHomePress={onHomePress} />,
    );

    fireEvent.press(getByTestId('contextual-money-tab-payments'));

    expect(getContextualNavState()).toEqual({
      section: 'money',
      tab: 'payments',
    });
    expect(
      getByTestId('contextual-money-tab-payments').props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      getByTestId('contextual-money-tab-account').props.accessibilityState,
    ).toEqual({ selected: false });
    expect(
      getByTestId('contextual-money-tab-payments').props.accessibilityLabel,
    ).toBe('Payments');
  });

  it('selects Search from the circle and returns home on long press', () => {
    enterMoneySection();

    const { getByTestId } = renderWithProvider(
      <ContextualMoneyTabBar onHomePress={onHomePress} />,
    );
    const searchButton = getByTestId('contextual-money-search-button');

    fireEvent.press(searchButton);

    expect(getContextualNavState().tab).toBe('search');
    expect(
      getByTestId('contextual-money-search-button').props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      getByTestId('contextual-money-search-button').props.accessibilityLabel,
    ).toBe(strings('wallet.search_accessibility_label'));
    expect(getByTestId('contextual-money-search-button').props.hitSlop).toEqual(
      {
        top: 4,
        bottom: 4,
        left: 4,
        right: 4,
      },
    );

    fireEvent(getByTestId('contextual-money-search-button'), 'longPress');

    expect(onHomePress).toHaveBeenCalledTimes(1);
  });

  it('selects Browser in the Explore pill', () => {
    enterExploreSection();

    const { getByTestId } = renderWithProvider(
      <ContextualExploreTabBar onHomePress={onHomePress} />,
    );

    fireEvent.press(getByTestId('contextual-explore-tab-browser'));

    expect(getContextualNavState()).toEqual({
      section: 'explore',
      tab: 'browser',
    });
    expect(
      getByTestId('contextual-explore-tab-browser').props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      getByTestId('contextual-explore-search-button').props.accessibilityState,
    ).toEqual({ selected: false });
  });

  it('shows a Payments placeholder with a header', () => {
    enterMoneySection();
    setContextualTab('payments');

    const { getByTestId, getByRole } = renderWithProvider(
      <ContextualHomeSectionOverlay />,
    );

    expect(getByTestId('contextual-section-placeholder')).toBeOnTheScreen();
    expect(getByRole('header')).toHaveTextContent('Payments');
  });

  it('leaves the Explore feed uncovered', () => {
    enterExploreSection();

    const { queryByTestId } = renderWithProvider(
      <ContextualHomeSectionOverlay />,
    );

    expect(queryByTestId('contextual-section-placeholder')).toBeNull();
  });
});
