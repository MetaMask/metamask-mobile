import React from 'react';
import { shallow } from 'enzyme';

import PickerNetwork from './PickerNetwork';
import { TEST_IMAGE_URL } from './PickerNetwork.constants';

describe('PickerNetwork', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <PickerNetwork
        onPress={jest.fn}
        networkLabel={'Ethereum Mainnet'}
        networkImageUrl={TEST_IMAGE_URL}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
