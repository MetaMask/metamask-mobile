import React from 'react';
import { render } from '@testing-library/react-native';

import AnimatedPulse from './animated-pulse';
import { Text } from '@metamask/design-system-react-native';

describe('AnimatedPulse', () => {
  it('should render correctly', () => {
    const { queryByText } = render(
      <AnimatedPulse>
        <Text>Test</Text>
      </AnimatedPulse>,
    );

    expect(queryByText('Test')).toBeTruthy();
  });
});
