import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedTransactionModal from './';
import { View } from 'react-native';

describe('AnimatedTransactionModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <AnimatedTransactionModal>
        <View />
      </AnimatedTransactionModal>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
