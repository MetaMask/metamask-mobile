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
  subtitle,
  image,
  isFullscreen,
  renderHeader,
  onDismiss,
}: {
  shouldOpen?: boolean;
  title?: string;
  subtitle?: string;
  image?: string;
  isFullscreen?: boolean;
  renderHeader?: () => React.ReactNode;
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
        subtitle={subtitle}
        image={image}
        isFullscreen={isFullscreen}
        renderHeader={renderHeader}
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

    expect(screen.queryByTestId('sheet-child')).not.toBeOnTheScreen();
  });

  it('renders children when opened', async () => {
    render(<TestComponent shouldOpen />);

    await waitFor(() => {
      expect(screen.getByTestId('sheet-child')).toBeOnTheScreen();
    });
    expect(screen.getByTestId('sheet-child')).toHaveTextContent(
      'Child Content',
    );
  });

  it('displays the provided title', async () => {
    render(<TestComponent shouldOpen title="My Custom Title" />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-sheet-title')).toBeOnTheScreen();
    });
    expect(screen.getByTestId('preview-sheet-title')).toHaveTextContent(
      'My Custom Title',
    );
  });

  it('renders without crashing when onDismiss is not provided', () => {
    expect(() => render(<TestComponent shouldOpen />)).not.toThrow();
  });

  it('renders subtitle when provided', async () => {
    render(<TestComponent shouldOpen subtitle="Odds 51¢" />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-sheet-subtitle')).toBeOnTheScreen();
    });
    expect(screen.getByTestId('preview-sheet-subtitle')).toHaveTextContent(
      'Odds 51¢',
    );
  });

  it('hides subtitle when not provided', async () => {
    render(<TestComponent shouldOpen />);

    await waitFor(() => {
      expect(screen.getByTestId('sheet-child')).toBeOnTheScreen();
    });
    expect(
      screen.queryByTestId('preview-sheet-subtitle'),
    ).not.toBeOnTheScreen();
  });

  it('renders image when provided', async () => {
    render(<TestComponent shouldOpen image="https://img.example.com/a.png" />);

    await waitFor(() => {
      expect(screen.getByTestId('sheet-child')).toBeOnTheScreen();
    });
  });

  it('hides image when not provided', async () => {
    render(<TestComponent shouldOpen />);

    await waitFor(() => {
      expect(screen.getByTestId('sheet-child')).toBeOnTheScreen();
    });
  });

  it('renders custom header via renderHeader prop', async () => {
    const customHeader = () => (
      <Text testID="custom-header">Custom Header</Text>
    );

    render(<TestComponent shouldOpen renderHeader={customHeader} />);

    await waitFor(() => {
      expect(screen.getByTestId('custom-header')).toBeOnTheScreen();
    });
    expect(screen.getByTestId('custom-header')).toHaveTextContent(
      'Custom Header',
    );
  });

  it('renders default header when renderHeader is not provided', async () => {
    render(<TestComponent shouldOpen title="Default Title" />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-sheet-title')).toBeOnTheScreen();
    });
    expect(screen.getByTestId('preview-sheet-title')).toHaveTextContent(
      'Default Title',
    );
  });
});
