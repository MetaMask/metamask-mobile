import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaOnboardingPlaceholder from './VbaOnboardingPlaceholder';
import VbaOnboardingStatusScreen, {
  VbaOnboardingStatusScreenSelectorsIDs,
} from './VbaOnboardingStatusScreen';

describe('VbaOnboardingStatusScreen', () => {
  it('renders the visual and title', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <VbaOnboardingStatusScreen
        visual={<VbaOnboardingPlaceholder />}
        title="Verifying your identity"
      />,
    );

    expect(
      getByTestId(VbaOnboardingStatusScreenSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaOnboardingStatusScreenSelectorsIDs.VISUAL),
    ).toBeOnTheScreen();
    expect(getByText('Verifying your identity')).toBeOnTheScreen();
  });

  it('renders a description when one is provided', () => {
    const { getByText } = renderWithProvider(
      <VbaOnboardingStatusScreen
        visual={<VbaOnboardingPlaceholder />}
        title="Identity verified"
        description="You can continue."
      />,
    );

    expect(getByText('You can continue.')).toBeOnTheScreen();
  });

  it('calls the bottom action', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <VbaOnboardingStatusScreen
        visual={<VbaOnboardingPlaceholder />}
        title="Identity verified"
        action={{ label: 'Continue', onPress }}
      />,
    );

    fireEvent.press(getByTestId(VbaOnboardingStatusScreenSelectorsIDs.ACTION));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
