import React from 'react';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ErrorModal from './ErrorModal';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

const mockOnClose = jest.fn();

describe('ErrorModal', () => {
  const initialMetrics: Metrics = {
    frame: { x: 0, y: 0, width: 320, height: 640 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible with default text', () => {
    const { toJSON, getByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ErrorModal isVisible onClose={mockOnClose} />
      </SafeAreaProvider>,
    );

    expect(getByText('Error')).toBeTruthy();
    expect(getByText('Placeholder error message')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with custom title and description', () => {
    const { getByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ErrorModal
          isVisible
          onClose={mockOnClose}
          title="Custom Error Title"
          description="Custom error description text"
        />
      </SafeAreaProvider>,
    );

    expect(getByText('Custom Error Title')).toBeTruthy();
    expect(getByText('Custom error description text')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByTestId } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ErrorModal isVisible={false} onClose={mockOnClose} />
      </SafeAreaProvider>,
    );

    expect(queryByTestId('ramps-error-modal')).toBeNull();
  });

  it('renders with custom testID', () => {
    const { getByTestId } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ErrorModal
          isVisible
          onClose={mockOnClose}
          testID="custom-error-test-id"
        />
      </SafeAreaProvider>,
    );

    expect(getByTestId('custom-error-test-id')).toBeTruthy();
    expect(getByTestId('custom-error-test-id-title')).toBeTruthy();
    expect(getByTestId('custom-error-test-id-description')).toBeTruthy();
  });
});
