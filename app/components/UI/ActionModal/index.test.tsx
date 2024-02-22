import React from 'react';
import { render } from '@testing-library/react-native';
import ActionModal from './';

describe('ActionModal', () => {
  it('should render correctly', () => {
    const wrapper = render(<ActionModal />);
    expect(wrapper).toMatchSnapshot();
  });
});
