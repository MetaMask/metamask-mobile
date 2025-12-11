// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import BottomSheetHeader from './BottomSheetHeader';
import { BottomSheetHeaderVariant } from './BottomSheetHeader.types';

describe('BottomSheetHeader', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <BottomSheetHeader>Sample Header Title</BottomSheetHeader>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders with back button when onBack is provided', () => {
    const onBackMock = jest.fn();
    const { getByTestId } = render(
      <BottomSheetHeader
        onBack={onBackMock}
        backButtonProps={{ testID: 'back-button' }}
        testID="header"
      >
        Header Content
      </BottomSheetHeader>,
    );

    // The back button should be rendered and accessible via testID
    expect(getByTestId('back-button')).toBeTruthy();
    expect(getByTestId('header-title')).toBeTruthy();
  });

  it('renders with close button when onClose is provided', () => {
    const onCloseMock = jest.fn();
    const { getByTestId } = render(
      <BottomSheetHeader
        onClose={onCloseMock}
        closeButtonProps={{ testID: 'close-button' }}
        testID="header"
      >
        Header Content
      </BottomSheetHeader>,
    );

    // The close button should be rendered and accessible via testID
    expect(getByTestId('close-button')).toBeTruthy();
    expect(getByTestId('header-title')).toBeTruthy();
  });

  it('renders with both back and close buttons using button props', () => {
    const onBackMock = jest.fn();
    const onCloseMock = jest.fn();
    const { getByTestId } = render(
      <BottomSheetHeader
        onBack={onBackMock}
        backButtonProps={{
          testID: 'custom-back-btn',
          accessibilityLabel: 'Go back',
        }}
        onClose={onCloseMock}
        closeButtonProps={{
          testID: 'custom-close-btn',
          accessibilityLabel: 'Close modal',
        }}
        testID="header"
      >
        Header Content
      </BottomSheetHeader>,
    );

    const backButton = getByTestId('custom-back-btn');
    const closeButton = getByTestId('custom-close-btn');

    expect(backButton).toBeTruthy();
    expect(closeButton).toBeTruthy();
    expect(backButton.props.accessibilityLabel).toBe('Go back');
    expect(closeButton.props.accessibilityLabel).toBe('Close modal');
  });

  it('passes additional props to button components', () => {
    const onBackMock = jest.fn();
    const { getByTestId } = render(
      <BottomSheetHeader
        onBack={onBackMock}
        backButtonProps={{
          testID: 'styled-back-btn',
          isDisabled: true,
          style: { opacity: 0.5 },
        }}
        testID="header"
      >
        Header Content
      </BottomSheetHeader>,
    );

    const backButton = getByTestId('styled-back-btn');
    expect(backButton).toBeTruthy();
    expect(backButton.props.style).toMatchObject(
      expect.objectContaining({ opacity: 0.5 }),
    );
  });

  it('renders snapshot correctly with Display variant', () => {
    const wrapper = render(
      <BottomSheetHeader variant={BottomSheetHeaderVariant.Display}>
        Sample Header Title
      </BottomSheetHeader>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders snapshot correctly with Compact variant', () => {
    const wrapper = render(
      <BottomSheetHeader variant={BottomSheetHeaderVariant.Compact}>
        Sample Header Title
      </BottomSheetHeader>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
