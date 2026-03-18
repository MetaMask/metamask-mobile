import React from 'react';
import { Text } from 'react-native';
import OnboardingScreenWithBg from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('OnboardingScreenWithBg', () => {
  it('renders correctly', () => {
    const component = renderWithProvider(
      <OnboardingScreenWithBg screen={'carousel'}>
        <Text>Test</Text>
      </OnboardingScreenWithBg>,
    );
    expect(component).toMatchSnapshot();
  });

  it('renders correctly with background color and image', () => {
    const component = renderWithProvider(
      <OnboardingScreenWithBg screen={'a'} backgroundColor={'red'}>
        <Text>Test</Text>
      </OnboardingScreenWithBg>,
    );
    expect(component).toMatchSnapshot();
  });
});
