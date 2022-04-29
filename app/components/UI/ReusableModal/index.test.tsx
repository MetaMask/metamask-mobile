import React from 'react';
import { SafeAreaView } from 'react-native';
import { shallow } from 'enzyme';
import ReusableModal from './';

describe('ReusableModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <SafeAreaView>
        <ReusableModal />
      </SafeAreaView>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
