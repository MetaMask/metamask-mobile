import React from 'react';
import PaymentMethodListSkeleton from './PaymentMethodListSkeleton';
import { render } from '@testing-library/react-native';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';

describe('PaymentMethodListSkeleton', () => {
  it('renders 8 skeleton loading rows', () => {
    const { UNSAFE_getAllByType } = render(<PaymentMethodListSkeleton />);
    expect(UNSAFE_getAllByType(ListItemSelect)).toHaveLength(8);
  });
});
