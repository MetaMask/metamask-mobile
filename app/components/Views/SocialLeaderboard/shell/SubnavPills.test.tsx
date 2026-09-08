import React from 'react';
import { Text } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SubnavPills, { getSubnavPillTestId } from './SubnavPills';
import { SOCIAL_SHELL_TAB_CONFIG } from './tabConfig';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('SubnavPills', () => {
  it('renders every configured pill with its translated label', () => {
    const onChange = jest.fn();

    renderWithProvider(
      <SubnavPills
        items={SOCIAL_SHELL_TAB_CONFIG.feed.subnav}
        value="trending"
        onChange={onChange}
      />,
    );

    expect(
      screen.getByTestId(getSubnavPillTestId('trending')),
    ).toHaveTextContent('social_leaderboard.shell.subnav.trending');
    expect(
      screen.getByTestId(getSubnavPillTestId('following')),
    ).toHaveTextContent('social_leaderboard.feed.following');
  });

  it('reports the selected pill id', () => {
    const onChange = jest.fn();
    renderWithProvider(
      <SubnavPills
        items={SOCIAL_SHELL_TAB_CONFIG.feed.subnav}
        value="trending"
        onChange={onChange}
      />,
    );

    fireEvent.press(screen.getByTestId(getSubnavPillTestId('following')));

    expect(onChange).toHaveBeenCalledWith('following');
  });

  it('keeps the whale emoji outside the translated label', () => {
    const onChange = jest.fn();
    renderWithProvider(
      <SubnavPills
        items={SOCIAL_SHELL_TAB_CONFIG.liveTrades.subnav}
        value="memecoins"
        onChange={onChange}
      />,
    );

    expect(screen.getByTestId(getSubnavPillTestId('whales'))).toHaveTextContent(
      '🐋 social_leaderboard.shell.subnav.whales',
    );
  });

  it('renders the end accessory alongside the pills', () => {
    renderWithProvider(
      <SubnavPills
        items={SOCIAL_SHELL_TAB_CONFIG.feed.subnav}
        value="trending"
        onChange={jest.fn()}
        endAccessory={<Text testID="subnav-accessory">All types</Text>}
      />,
    );

    expect(screen.getByTestId('subnav-accessory')).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSubnavPillTestId('trending')),
    ).toBeOnTheScreen();
  });
});
