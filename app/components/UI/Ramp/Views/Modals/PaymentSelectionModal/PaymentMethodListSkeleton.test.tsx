import React from 'react';
import PaymentMethodListSkeleton from './PaymentMethodListSkeleton';
import { render } from '@testing-library/react-native';

describe('PaymentMethodListSkeleton', () => {
  it('matches snapshot', () => {
    const component = render(<PaymentMethodListSkeleton />);
    expect(component).toMatchSnapshot();
  });
});
