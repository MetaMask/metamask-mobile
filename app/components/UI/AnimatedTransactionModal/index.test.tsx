import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedTransactionModal from './';

describe('AnimatedTransactionModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<AnimatedTransactionModal />);
    expect(toJSON()).toMatchSnapshot();
  });
});
