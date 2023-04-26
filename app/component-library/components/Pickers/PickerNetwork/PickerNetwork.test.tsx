// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import PickerNetwork from './PickerNetwork';
import { TEST_IMAGE_URL } from './PickerNetwork.constants';

describe('PickerNetwork', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <PickerNetwork
        onPress={jest.fn}
        label={'Ethereum Mainnet'}
        imageSource={{ uri: TEST_IMAGE_URL }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
