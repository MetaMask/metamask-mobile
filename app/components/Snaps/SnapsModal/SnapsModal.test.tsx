import React from 'react';
import { View, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import SnapsModal from './SnapsModal';

jest.mock('react-native-modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return jest.fn(
    ({ children, isVisible, onBackdropPress, onSwipeComplete }) => {
      if (!isVisible) return null;
      return (
        <View testID="modal-container">
          <View testID="modal-backdrop" onTouchEnd={onBackdropPress} />
          <View testID="modal-swipe-area" onTouchEnd={onSwipeComplete} />
          <View testID="modal-content">{children}</View>
        </View>
      );
    },
  );
});

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
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isVisible is false', () => {
    const { queryByTestId } = render(
      <SnapsModal isVisible={false} onCancel={mockOnCancel}>
        <Text>Modal content</Text>
      </SnapsModal>,
    );

    expect(queryByTestId('modal-container')).toBeNull();
  });

  it('renders modal when isVisible is true', () => {
    const { getByTestId } = render(
      <SnapsModal isVisible={true} onCancel={mockOnCancel}>
        <Text>Modal content</Text>
      </SnapsModal>,
    );

    expect(getByTestId('modal-container')).toBeDefined();
    expect(getByTestId('modal-content')).toBeDefined();
  });

  it('renders children inside the modal', () => {
    const testId = 'test-child';
    const { getByTestId } = render(
      <SnapsModal isVisible={true} onCancel={mockOnCancel}>
        <View testID={testId}>
          <Text>Modal content</Text>
        </View>
      </SnapsModal>,
    );

    expect(getByTestId('modal-content')).toBeDefined();
    expect(getByTestId(testId)).toBeDefined();
  });

  it('calls onCancel when backdrop is pressed', () => {
    const { getByTestId } = render(
      <SnapsModal isVisible={true} onCancel={mockOnCancel}>
        <Text>Modal content</Text>
      </SnapsModal>,
    );

    fireEvent(getByTestId('modal-backdrop'), 'touchEnd');
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when modal is swiped down', () => {
    const { getByTestId } = render(
      <SnapsModal isVisible={true} onCancel={mockOnCancel}>
        <Text>Modal content</Text>
      </SnapsModal>,
    );

    fireEvent(getByTestId('modal-swipe-area'), 'touchEnd');
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('uses the contentContainer style for proper sizing', () => {
    const mockReactNativeModal = require('react-native-modal');

    render(
      <SnapsModal isVisible={true} onCancel={mockOnCancel}>
        <Text>Modal content</Text>
      </SnapsModal>,
    );

    const mostRecentCall =
      mockReactNativeModal.mock.calls[
        mockReactNativeModal.mock.calls.length - 1
      ][0];
    const containerProps = mostRecentCall.children.props;

    expect(containerProps.testID).toBe('snaps-modal-content-container');
    expect(containerProps.style).toHaveProperty('flexShrink', 1);
  });

  it('passes the correct props to the Modal component', () => {
    render(
      <SnapsModal isVisible={true} onCancel={mockOnCancel}>
        <Text>Modal content</Text>
      </SnapsModal>,
    );

    const mockReactNativeModal = require('react-native-modal');
    expect(mockReactNativeModal).toHaveBeenCalledWith(
      expect.objectContaining({
        isVisible: true,
        animationIn: 'slideInUp',
        animationOut: 'slideOutDown',
        backdropOpacity: 1,
        avoidKeyboard: true,
        propagateSwipe: true,
        useNativeDriverForBackdrop: true,
        swipeDirection: 'down',
      }),
      {},
    );
  });
});
