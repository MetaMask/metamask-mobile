// Third party dependencies.
import React from 'react';
import { Platform, Text } from 'react-native';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import ModalSafeAreaProvider from './ModalSafeAreaProvider';

describe('ModalSafeAreaProvider', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  it('wraps children in a SafeAreaProvider on Android', () => {
    Platform.OS = 'android';

    const { getByTestId, getByText } = render(
      <ModalSafeAreaProvider testID="modal-safe-area">
        <Text>content</Text>
      </ModalSafeAreaProvider>,
    );

    expect(getByTestId('modal-safe-area')).toBeOnTheScreen();
    expect(getByText('content')).toBeOnTheScreen();
  });

  it('renders children without a provider on iOS', () => {
    Platform.OS = 'ios';

    const { queryByTestId, getByText } = render(
      <ModalSafeAreaProvider testID="modal-safe-area">
        <Text>content</Text>
      </ModalSafeAreaProvider>,
    );

    expect(queryByTestId('modal-safe-area')).toBeNull();
    expect(getByText('content')).toBeOnTheScreen();
  });
});
