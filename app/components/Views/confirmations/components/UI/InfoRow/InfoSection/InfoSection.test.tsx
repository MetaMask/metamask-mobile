import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';

import InfoSection from './index';

describe('InfoSection', () => {
  it('should render text passed correctly', async () => {
    const { getByText } = render(
      <InfoSection>
        <View>
          <Text>Test</Text>
        </View>
      </InfoSection>,
    );
    expect(getByText('Test')).toBeDefined();
  });
});
