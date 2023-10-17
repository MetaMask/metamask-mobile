// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import BottomSheetHeader from './BottomSheetHeader';

describe('BottomSheetHeader', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <BottomSheetHeader>Sample Header Title</BottomSheetHeader>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
