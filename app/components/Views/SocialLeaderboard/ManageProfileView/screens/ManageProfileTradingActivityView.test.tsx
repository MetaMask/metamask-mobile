import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ManageProfileTradingActivitySelectorsIDs } from '../ManageProfileView.testIds';
import ManageProfileTradingActivityView from './ManageProfileTradingActivityView';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

describe('ManageProfileTradingActivityView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a display-only switch that stays on', () => {
    renderWithProvider(<ManageProfileTradingActivityView />);

    const activitySwitch = screen.getByTestId(
      ManageProfileTradingActivitySelectorsIDs.SWITCH,
    );

    fireEvent(activitySwitch, 'valueChange', false);

    expect(activitySwitch).toHaveProp('value', true);
    expect(activitySwitch).toHaveProp('accessibilityState', {
      disabled: true,
    });
  });

  it('does not navigate when the info icon is pressed', () => {
    renderWithProvider(<ManageProfileTradingActivityView />);

    fireEvent.press(
      screen.getByTestId(ManageProfileTradingActivitySelectorsIDs.INFO_BUTTON),
    );

    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
