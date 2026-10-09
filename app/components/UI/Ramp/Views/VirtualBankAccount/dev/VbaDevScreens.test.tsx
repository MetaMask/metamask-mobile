import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../constants/navigation/Routes';
import { VbaOnboardingRoutes } from '../routes';
import VbaDevScreenPicker, {
  VbaDevScreenBody,
  VbaDevScreenSelectorsIDs,
} from './VbaDevScreens';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: { screenId: 'verified' },
  }),
}));

describe('VbaDevScreens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a screen from the picker', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <VbaDevScreenPicker />,
    );

    expect(getByText('VbaKycSuccess.tsx')).toBeOnTheScreen();

    fireEvent.press(getByTestId(`${VbaDevScreenSelectorsIDs.PICKER}-verified`));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.VBA_ONBOARDING, {
      screen: VbaOnboardingRoutes.DEV_SCREEN,
      params: { screenId: 'verified' },
    });
  });

  it('renders the identity verified status', () => {
    const { getByText } = renderWithProvider(
      <VbaDevScreenBody screenId="verified" />,
    );

    expect(getByText('Identity verified')).toBeOnTheScreen();
  });
});
