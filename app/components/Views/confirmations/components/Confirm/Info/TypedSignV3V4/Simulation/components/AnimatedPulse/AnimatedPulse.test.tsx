import React from 'react';
import { render } from '@testing-library/react-native';

import Text from '../../../../../../../../../../component-library/components/Texts/Text';
import AnimatedPulse from './AnimatedPulse';

describe('AnimatedPulse', () => {
  it('should render correctly', () => {
    const {queryByText} = render(
    <AnimatedPulse>
      <Text>Test</Text>
    </AnimatedPulse>);

    expect(queryByText('Test')).toBeTruthy();
  });
});
