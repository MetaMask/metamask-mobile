import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BasicFunctionalityEmptyState from './BasicFunctionalityEmptyState';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('BasicFunctionalityEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state', () => {
    const { getByText } = render(<BasicFunctionalityEmptyState />);

    expect(getByText('Explore is not available')).toBeDefined();
    expect(
      getByText(
        "We can't fetch the required metadata when basic functionality is disabled.",
      ),
    ).toBeDefined();
    expect(getByText('Enable basic functionality')).toBeDefined();
  });

  it('navigates to basic functionality settings when button is pressed', () => {
    const { getByText } = render(<BasicFunctionalityEmptyState />);

    const enableButton = getByText('Enable basic functionality');

    fireEvent.press(enableButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  });
});
