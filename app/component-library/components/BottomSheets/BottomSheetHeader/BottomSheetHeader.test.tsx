// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import BottomSheetHeader from './BottomSheetHeader';
import { BottomSheetHeaderAlignment } from './BottomSheetHeader.types';

describe('BottomSheetHeader', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <BottomSheetHeader>Sample Header Title</BottomSheetHeader>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render center-aligned header correctly', () => {
    const wrapper = render(
      <BottomSheetHeader
        alignment={BottomSheetHeaderAlignment.Center}
        onBack={jest.fn()}
        onClose={jest.fn()}
      >
        Center Aligned Title
      </BottomSheetHeader>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render left-aligned header correctly', () => {
    const wrapper = render(
      <BottomSheetHeader
        alignment={BottomSheetHeaderAlignment.Left}
        onClose={jest.fn()}
      >
        Left Aligned Title
      </BottomSheetHeader>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render left-aligned header with back button correctly', () => {
    const wrapper = render(
      <BottomSheetHeader
        alignment={BottomSheetHeaderAlignment.Left}
        onBack={jest.fn()}
        onClose={jest.fn()}
      >
        Left Aligned with Back
      </BottomSheetHeader>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render left-aligned header with custom children correctly', () => {
    const CustomChild = () => <div>Custom Content</div>;
    const wrapper = render(
      <BottomSheetHeader
        alignment={BottomSheetHeaderAlignment.Left}
        onClose={jest.fn()}
      >
        <CustomChild />
      </BottomSheetHeader>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
