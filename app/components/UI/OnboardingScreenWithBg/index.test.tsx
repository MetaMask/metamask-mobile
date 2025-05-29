import React from 'react';
import { Text } from 'react-native';
import OnboardingScreenWithBg from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('OnboardingScreenWithBg', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <OnboardingScreenWithBg screen={'carousel'}>
        <Text>Test</Text>
      </OnboardingScreenWithBg>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with background color and image', () => {
    const { toJSON } = renderWithProvider(
      <OnboardingScreenWithBg screen={'a'} backgroundColor={'red'}>
        <Text>Test</Text>
      </OnboardingScreenWithBg>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
