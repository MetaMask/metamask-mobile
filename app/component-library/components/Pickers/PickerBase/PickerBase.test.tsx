// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import PickerBase from './PickerBase';

describe('PickerBase', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <PickerBase onPress={jest.fn}>
        <View />
      </PickerBase>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
