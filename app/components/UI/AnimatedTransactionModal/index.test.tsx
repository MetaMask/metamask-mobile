import React from 'react';
import { shallow } from 'enzyme';
import AnimatedTransactionModal from './';
import { View } from 'react-native';

describe('AnimatedTransactionModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AnimatedTransactionModal>
        <View />
      </AnimatedTransactionModal>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
