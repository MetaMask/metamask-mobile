import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import BasicFunctionalityEmptyState from './BasicFunctionalityEmptyState';
import Routes from '../../../../constants/navigation/Routes';

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

  it('renders empty state with default title', () => {
    const { getByText, queryByTestId } = render(
      <BasicFunctionalityEmptyState />,
    );

    expect(getByText('Explore is not available')).toBeOnTheScreen();
    expect(
      getByText(
        "We can't fetch the required metadata when basic functionality is disabled.",
      ),
    ).toBeOnTheScreen();
    expect(getByText('Enable basic functionality')).toBeOnTheScreen();
    expect(
      queryByTestId('basic-functionality-empty-state-icon-container'),
    ).toBeNull();
  });

  it('renders custom title when title prop is provided', () => {
    const customTitle = 'Custom Title';
    const { getByText } = render(
      <BasicFunctionalityEmptyState title={customTitle} />,
    );

    expect(getByText(customTitle)).toBeOnTheScreen();
  });

  it('renders icon when iconName prop is provided', () => {
    const { getByTestId } = render(
      <BasicFunctionalityEmptyState iconName={IconName.Warning} />,
    );

    expect(
      getByTestId('basic-functionality-empty-state-icon-container'),
    ).toBeOnTheScreen();
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
