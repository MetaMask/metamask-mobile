import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import SnapsModal from './SnapsModal';

const mockCallbacks = {
  backdropPress: null as (() => void) | null,
  swipeComplete: null as (() => void) | null,
};

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow, @typescript-eslint/no-require-imports */
jest.mock(
  'react-native-modal',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function MockModal(props: any) {
      const React = require('react');
      const { View } = require('react-native');

      const {
        isVisible,
        onBackdropPress,
        onSwipeComplete,
        children,
        animationIn,
        animationOut,
        style,
        swipeDirection,
        propagateSwipe,
        avoidKeyboard,
      } = props;

      if (!isVisible) return null;

      if (onBackdropPress) mockCallbacks.backdropPress = onBackdropPress;
      if (onSwipeComplete) mockCallbacks.swipeComplete = onSwipeComplete;

      return React.createElement(
        View,
        { testID: 'modal-root' },
        React.createElement(View, {
          testID: 'modal-backdrop',
          style: { width: '100%', height: '100%' },
          onTouchEnd: () => onBackdropPress(),
        }),
        React.createElement(
          View,
          {
            testID: 'modal-content-wrapper',
            style,
            'data-animation-in': animationIn,
            'data-animation-out': animationOut,
            'data-swipe-direction': swipeDirection,
            'data-propagate-swipe': propagateSwipe ? 'true' : 'false',
            'data-avoid-keyboard': avoidKeyboard ? 'true' : 'false',
          },
          children,
        ),
      );
    },
);
/* eslint-enable @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow, @typescript-eslint/no-require-imports */

jest.mock('../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      overlay: {
        default: 'rgba(0, 0, 0, 0.75)',
      },
    },
  })),
}));

describe('SnapsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallbacks.backdropPress = null;
    mockCallbacks.swipeComplete = null;
  });

  it('renders a snapshot with modal visible', () => {
    const { toJSON } = render(
      <SnapsModal isVisible onCancel={() => undefined}>
        <Text>test content</Text>
      </SnapsModal>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders a snapshot with modal hidden', () => {
    const { toJSON } = render(
      <SnapsModal isVisible={false} onCancel={() => undefined}>
        <Text>test content</Text>
      </SnapsModal>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders nothing when isVisible is false', () => {
    const { queryByTestId } = render(
      <SnapsModal isVisible={false} onCancel={jest.fn()}>
        <Text>test content</Text>
      </SnapsModal>,
    );

    expect(queryByTestId('modal-root')).toBeNull();
  });

  it('renders modal content when isVisible is true', () => {
    const { getByTestId } = render(
      <SnapsModal isVisible onCancel={jest.fn()}>
        <Text>test content</Text>
      </SnapsModal>,
    );

    expect(getByTestId('modal-root')).toBeTruthy();
    expect(getByTestId('modal-content-wrapper')).toBeTruthy();
  });

  it('wraps children in a content container with correct testID', () => {
    const { getByTestId } = render(
      <SnapsModal isVisible onCancel={jest.fn()}>
        <Text testID="child-component">test content</Text>
      </SnapsModal>,
    );

    const container = getByTestId('snaps-modal-content-container');
    expect(container).toBeTruthy();

    expect(getByTestId('child-component')).toBeTruthy();
  });

  it('passes onCancel to onBackdropPress', () => {
    const mockCancel = jest.fn();

    render(
      <SnapsModal isVisible onCancel={mockCancel}>
        <Text>test content</Text>
      </SnapsModal>,
    );

    expect(mockCallbacks.backdropPress).toBe(mockCancel);
  });

  it('passes onCancel to onSwipeComplete', () => {
    const mockCancel = jest.fn();

    render(
      <SnapsModal isVisible onCancel={mockCancel}>
        <Text>test content</Text>
      </SnapsModal>,
    );

    expect(mockCallbacks.swipeComplete).toBe(mockCancel);
  });

  it('calls onCancel when backdrop is pressed', () => {
    const mockCancel = jest.fn();

    const { getByTestId } = render(
      <SnapsModal isVisible onCancel={mockCancel}>
        <Text>test content</Text>
      </SnapsModal>,
    );

    fireEvent(getByTestId('modal-backdrop'), 'touchEnd');

    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it('has correct modal animation properties', () => {
    const { getByTestId } = render(
      <SnapsModal isVisible onCancel={jest.fn()}>
        <Text>test content</Text>
      </SnapsModal>,
    );

    const contentWrapper = getByTestId('modal-content-wrapper');

    expect(contentWrapper.props['data-animation-in']).toBe('slideInUp');
    expect(contentWrapper.props['data-animation-out']).toBe('slideOutDown');
    expect(contentWrapper.props['data-swipe-direction']).toBe('down');
    expect(contentWrapper.props['data-propagate-swipe']).toBe('true');
    expect(contentWrapper.props['data-avoid-keyboard']).toBe('true');
  });
});
