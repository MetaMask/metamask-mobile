import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import SampleFeatureDevSettingsEntryPoint from './SampleFeatureDevSettingsEntryPoint';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('SampleFeature', () => {
  it('renders correctly', () => {
    const { getByText } = renderWithProvider(
      <SampleFeatureDevSettingsEntryPoint />,
    );

    // Check that the component renders the expected text
    expect(getByText('Sample feature')).toBeDefined();
    expect(
      getByText('A sample feature as a template for developers.'),
    ).toBeDefined();
    expect(getByText('Navigate to sample feature')).toBeDefined();
  });

  it('navigates to SampleFeature', () => {
    const { getByRole } = renderWithProvider(
      <SampleFeatureDevSettingsEntryPoint />,
    );
    const navigateButton = getByRole('button');
    fireEvent.press(navigateButton);
    expect(navigateButton).toBeDefined();
    expect(mockNavigate).toHaveBeenCalledWith('SampleFeature');
  });
});
