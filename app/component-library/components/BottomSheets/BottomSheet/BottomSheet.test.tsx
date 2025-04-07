import React, { useCallback, useRef } from 'react';
import { BottomSheetRef } from './BottomSheet.types';
import BottomSheet from './BottomSheet';
import Button, { ButtonVariants } from '../../Buttons/Button';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

interface TestComponentProps {
  hasClosed: () => void;
}

const TestComponent = (props: TestComponentProps) => {
  const { hasClosed } = props;
  const sheetRef = useRef<BottomSheetRef>(null);

  // When handleClose is called it will invoke ref onClose.
  // > This will trigger the BottomSheet onClose prop
  // >> Which calls ref onClose, this will trigger the BottomSheet onClose prop
  // >>> Which calls ref onClose, this will trigger the BottomSheet onClose prop
  // ...
  // Infinite Recursion Loop when closing.
  const handleClose = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('CLOSE CALLED');
    sheetRef.current?.onCloseBottomSheet();
    hasClosed();
  }, [hasClosed]);

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={handleClose}
      shouldNavigateBack={false}
    >
      <View>
        <Button
          variant={ButtonVariants.Primary}
          label="Close Me"
          onPress={handleClose}
        />
      </View>
    </BottomSheet>
  );
};

describe('BottomSheet tests', () => {
  test('closing sheet with ref + onClose prop', async () => {
    const mockHasClosed = jest.fn();
    const { getByText, debug } = render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <TestComponent hasClosed={mockHasClosed} />
      </SafeAreaProvider>,
    );

    debug();

    await waitFor(() => {
      const closeButton = getByText('Close Me');
      fireEvent.press(closeButton);
    });

    expect(mockHasClosed).toHaveBeenCalled();
  });
});
