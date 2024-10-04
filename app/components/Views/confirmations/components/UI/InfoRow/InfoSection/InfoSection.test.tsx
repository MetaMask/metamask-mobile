import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';

import InfoSection from './index';

describe('InfoSection', () => {
  it('should match snapshot for simple text value', async () => {
    const container = render(
      <InfoSection>
        <View>
          <Text>Test</Text>
        </View>
      </InfoSection>,
    );
    expect(container).toMatchSnapshot();
  });
});
