// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import SelectableHeader from './SelectableHeader';

describe('SelectableHeader', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <SelectableHeader>Sample Header Title</SelectableHeader>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
