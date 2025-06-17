import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import SampleFeatureDevSettingsEntryPoint from './SampleFeatureDevSettingsEntryPoint';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('SampleFeature', () => {
  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <SampleFeatureDevSettingsEntryPoint />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to SampleFeature', () => {
    const { getByRole } = renderWithProvider(
      <SampleFeatureDevSettingsEntryPoint />,
    );
    const navigateButton = getByRole('button');
    navigateButton.props.onPress();
    expect(navigateButton).toBeDefined();
    expect(mockNavigate).toHaveBeenCalledWith('SampleFeature');
  });
});
