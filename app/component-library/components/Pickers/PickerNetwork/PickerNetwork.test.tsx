// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import PickerNetwork from './PickerNetwork';
import { TEST_IMAGE_URL } from './PickerNetwork.constants';

describe('PickerNetwork', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <PickerNetwork
        onPress={jest.fn}
        label={'Ethereum Mainnet'}
        imageSource={{ uri: TEST_IMAGE_URL }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
