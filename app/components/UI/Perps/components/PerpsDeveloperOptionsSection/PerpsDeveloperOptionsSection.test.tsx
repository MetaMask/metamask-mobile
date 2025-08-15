import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PerpsDeveloperOptionsSection } from './PerpsDeveloperOptionsSection';
import {
  PerpsDeveloperOptionsSectionSelectorsIDs,
  PerpsTestnetToggleSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

// Mock react-navigation
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('PerpsDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<PerpsDeveloperOptionsSection />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the perpetual trading heading', () => {
    const { getByText } = renderWithProvider(<PerpsDeveloperOptionsSection />);
    expect(getByText('Perps Trading')).toBeVisible();
  });

  it('renders the PerpsTestnetToggle component', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsDeveloperOptionsSection />,
    );
    expect(getByTestId(PerpsTestnetToggleSelectorsIDs.ROOT)).toBeVisible();
  });

  it('navigates to perps sandbox when button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsDeveloperOptionsSection />,
    );

    const sandboxButton = getByTestId(
      PerpsDeveloperOptionsSectionSelectorsIDs.PERPS_SANDBOX_BUTTON,
    );
    fireEvent.press(sandboxButton);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT);
  });
});
