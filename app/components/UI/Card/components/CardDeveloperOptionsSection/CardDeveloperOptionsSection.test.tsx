import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import CardDeveloperOptionsSection from './CardDeveloperOptionsSection';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';

jest.mock('../../../../../core/redux/slices/card', () => ({
  resetOnboardingState: jest.fn(() => ({ type: 'card/resetOnboardingState' })),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

describe('CardDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Card heading', () => {
    const { getByText } = renderWithProvider(<CardDeveloperOptionsSection />);

    expect(getByText('Card')).toBeDefined();
  });

  it('renders the description text', () => {
    const { getByText } = renderWithProvider(<CardDeveloperOptionsSection />);

    expect(
      getByText(
        'Reset Card onboarding state to start the onboarding flow from the beginning.',
      ),
    ).toBeDefined();
  });

  it('renders the Reset Onboarding State button', () => {
    const { getByText } = renderWithProvider(<CardDeveloperOptionsSection />);

    expect(getByText('Reset Onboarding State')).toBeDefined();
  });

  it('dispatches resetOnboardingState when button is pressed', () => {
    const { getByText } = renderWithProvider(<CardDeveloperOptionsSection />);

    const button = getByText('Reset Onboarding State');
    fireEvent.press(button);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(resetOnboardingState).toHaveBeenCalledTimes(1);
  });
});
