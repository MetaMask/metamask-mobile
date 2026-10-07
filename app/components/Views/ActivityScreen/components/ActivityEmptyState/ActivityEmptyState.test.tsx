import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
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

  it('shows the title, description and action for the active filter', () => {
    render(<ActivityEmptyState typeFilter={ActivityTypeFilter.Transactions} />);

    expect(
      screen.getByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE_TITLE),
    ).toHaveTextContent('No transactions yet');
    expect(
      screen.getByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE_DESCRIPTION),
    ).toHaveTextContent('Swap your first token today.');
    expect(
      screen.getByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE_ACTION),
    ).toHaveTextContent('Swap tokens');
  });

  it('routes each CTA to the expected destination', () => {
    render(<ActivityEmptyState typeFilter={ActivityTypeFilter.Predictions} />);
    fireEvent.press(
      screen.getByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE_ACTION),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });

    cleanup();
    render(<ActivityEmptyState typeFilter={ActivityTypeFilter.Perps} />);
    fireEvent.press(
      screen.getByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE_ACTION),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {},
    });

    cleanup();
    render(<ActivityEmptyState typeFilter={ActivityTypeFilter.BuySell} />);
    fireEvent.press(
      screen.getByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE_ACTION),
    );
    expect(mockGoToBuy).toHaveBeenCalledTimes(1);

    cleanup();
    render(<ActivityEmptyState typeFilter={ActivityTypeFilter.MetamaskCard} />);
    fireEvent.press(
      screen.getByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE_ACTION),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
  });
});
