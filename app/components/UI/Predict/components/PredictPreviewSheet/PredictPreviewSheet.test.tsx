import React, { useRef, useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PredictPreviewSheet, {
  PredictPreviewSheetRef,
} from './PredictPreviewSheet';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

const TestComponent = ({
  shouldOpen = false,
  title = 'Sheet Title',
  onDismiss,
}: {
  shouldOpen?: boolean;
  title?: string;
  onDismiss?: () => void;
}) => {
  const ref = useRef<PredictPreviewSheetRef>(null);

  useEffect(() => {
    if (shouldOpen) {
      ref.current?.onOpenBottomSheet();
    }
  }, [shouldOpen]);

  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 44, left: 0, right: 0, bottom: 34 },
      }}
    >
      <PredictPreviewSheet
        ref={ref}
        title={title}
        onDismiss={onDismiss}
        testID="preview-sheet"
      >
        {(closeSheet) => (
          <Text testID="sheet-child" onPress={closeSheet}>
            Child Content
          </Text>
        )}
      </PredictPreviewSheet>
    </SafeAreaProvider>
  );
};

describe('PredictPreviewSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when not opened', () => {
    render(<TestComponent />);

    expect(screen.queryByTestId('sheet-child')).toBeNull();
  });

  it('renders children when opened', async () => {
    render(<TestComponent shouldOpen />);

    await waitFor(() => {
      expect(screen.getByTestId('sheet-child')).toBeOnTheScreen();
    });
    expect(screen.getByText('Child Content')).toBeOnTheScreen();
  });

  it('displays the provided title', async () => {
    render(<TestComponent shouldOpen title="My Custom Title" />);

    await waitFor(() => {
      expect(screen.getByText('My Custom Title')).toBeOnTheScreen();
    });
  });

  it('renders without crashing when onDismiss is not provided', () => {
    expect(() => render(<TestComponent shouldOpen />)).not.toThrow();
  });
});
