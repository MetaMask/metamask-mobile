// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import Card from './Card';

describe('Card - Snapshot', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Card>
        <View />
      </Card>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
