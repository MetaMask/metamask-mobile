import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import ActivityEmptyState from './ActivityEmptyState';
import { ActivityTypeFilter } from '../../types';
import Routes from '../../../../../constants/navigation/Routes';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';
import { useRampNavigation } from '../../../../UI/Ramp/hooks/useRampNavigation';
import { useMoneyAccountDeposit } from '../../../../UI/Money/hooks/useMoneyAccount';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => true),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  Theme: { Dark: 'dark', Light: 'light' },
  useTheme: jest.fn(() => 'light'),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text, TouchableOpacity, View } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => <View testID={testID}>{children}</View>,
    TabEmptyState: ({
      actionButtonText,
      description,
      onAction,
      testID,
    }: {
      actionButtonText: string;
      description: string;
      onAction: () => void;
      testID?: string;
    }) => (
      <TouchableOpacity testID={testID} onPress={onAction}>
        {ReactActual.createElement(Text, null, description)}
        {ReactActual.createElement(Text, null, actionButtonText)}
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../../../images/activity-empty-dark.svg', () => 'DarkIcon');
jest.mock('../../../../../images/activity-empty-light.svg', () => 'LightIcon');

jest.mock('../../../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(),
}));

jest.mock('../../../../UI/Money/hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockGoToBuy = jest.fn();
const mockInitiateDeposit = jest.fn(() => Promise.resolve());

describe('ActivityEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
    (useRampNavigation as jest.Mock).mockReturnValue({ goToBuy: mockGoToBuy });
    (useMoneyAccountDeposit as jest.Mock).mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
  });

  it('renders the empty state container and action copy', () => {
    render(<ActivityEmptyState typeFilter={ActivityTypeFilter.Transactions} />);

    expect(
      screen.getByTestId(ActivityScreenSelectorsIDs.LIST),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(screen.getByText('Swap tokens')).toBeOnTheScreen();
  });

  it('routes each CTA to the expected destination', async () => {
    render(<ActivityEmptyState typeFilter={ActivityTypeFilter.Predictions} />);
    fireEvent.press(screen.getByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });

    cleanup();
    render(<ActivityEmptyState typeFilter={ActivityTypeFilter.Perps} />);
    fireEvent.press(screen.getByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
    });

    cleanup();
    render(<ActivityEmptyState typeFilter={ActivityTypeFilter.BuySell} />);
    fireEvent.press(screen.getByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE));
    expect(mockGoToBuy).toHaveBeenCalledTimes(1);

    cleanup();
    render(<ActivityEmptyState typeFilter={ActivityTypeFilter.Money} />);
    fireEvent.press(screen.getByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE));
    await waitFor(() => expect(mockInitiateDeposit).toHaveBeenCalledTimes(1));

    cleanup();
    render(<ActivityEmptyState typeFilter={ActivityTypeFilter.MetamaskCard} />);
    fireEvent.press(screen.getByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
  });
});
