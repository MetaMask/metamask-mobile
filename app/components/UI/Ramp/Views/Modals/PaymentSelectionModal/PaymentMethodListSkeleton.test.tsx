import React from 'react';
import PaymentMethodListSkeleton from './PaymentMethodListSkeleton';
import { render } from '@testing-library/react-native';

describe('PaymentMethodListSkeleton', () => {
  it('matches snapshot', () => {
    const { toJSON } = render(<PaymentMethodListSkeleton />);
    expect(toJSON()).toMatchSnapshot();
  });
});
