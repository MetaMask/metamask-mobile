import React from 'react';
import { SafeAreaView } from 'react-native';
import { render } from '@testing-library/react-native';
import ReusableModal from './';

describe('ReusableModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <SafeAreaView>
        <ReusableModal>{null}</ReusableModal>
      </SafeAreaView>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
