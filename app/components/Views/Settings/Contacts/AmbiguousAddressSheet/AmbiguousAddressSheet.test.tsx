import React from 'react';
import { render } from '@testing-library/react-native';
import AmbiguousAddressSheet from './AmbiguousAddressSheet';

describe('AmbiguousAddressSheet', () => {
  it('should render correctly', () => {
    const wrapper = render(<AmbiguousAddressSheet />);
    expect(wrapper).toMatchSnapshot();
  });
});
