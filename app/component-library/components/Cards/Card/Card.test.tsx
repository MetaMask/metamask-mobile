// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import Card from './Card';

describe('Card - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Card>
        <View />
      </Card>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
