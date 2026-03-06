import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import CashTokensFullView from './CashTokensFullView';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../UI/Tokens', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  const MockTokens = ({
    isFullView,
    showOnlyMusd,
  }: {
    isFullView?: boolean;
    showOnlyMusd?: boolean;
  }) =>
    React.createElement(
      View,
      { testID: 'tokens-cash-view' },
      React.createElement(
        Text,
        { testID: 'tokens-props' },
        `isFullView=${isFullView} showOnlyMusd=${showOnlyMusd}`,
      ),
    );
  return { __esModule: true, default: MockTokens };
});

describe('CashTokensFullView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Cash title', () => {
    renderWithProvider(<CashTokensFullView />);
    expect(screen.getByText('Cash')).toBeOnTheScreen();
  });

  it('renders Tokens with isFullView and showOnlyMusd', () => {
    renderWithProvider(<CashTokensFullView />);
    expect(screen.getByTestId('tokens-cash-view')).toBeOnTheScreen();
    expect(
      screen.getByText('isFullView=true showOnlyMusd=true'),
    ).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', () => {
    renderWithProvider(<CashTokensFullView />);
    fireEvent.press(screen.getByTestId('back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
