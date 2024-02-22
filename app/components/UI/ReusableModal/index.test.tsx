import React from 'react';
import { SafeAreaView } from 'react-native';
import { render } from '@testing-library/react-native';
import ReusableModal from './';

describe('ReusableModal', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <SafeAreaView>
        <ReusableModal>{null}</ReusableModal>
      </SafeAreaView>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
