import React from 'react';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import UnsupportedRegionModal from './UnsupportedRegionModal';

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

describe('UnsupportedRegionModal', () => {
  const initialMetrics: Metrics = {
    frame: { x: 0, y: 0, width: 320, height: 640 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { toJSON, getByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <UnsupportedRegionModal isVisible onClose={mockOnClose} />
      </SafeAreaProvider>,
    );

    expect(getByText('Buy unavailable in your region')).toBeTruthy();
    expect(
      getByText(
        "Buying crypto isn't available in your location due to limitations with local payment providers or regulatory restrictions.",
      ),
    ).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('does not render when not visible', () => {
    const { queryByTestId } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <UnsupportedRegionModal isVisible={false} onClose={mockOnClose} />
      </SafeAreaProvider>,
    );

    expect(queryByTestId('ramps-unsupported-region-modal')).toBeNull();
  });

  it('renders with custom testID', () => {
    const { getByTestId } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <UnsupportedRegionModal
          isVisible
          onClose={mockOnClose}
          testID="custom-test-id"
        />
      </SafeAreaProvider>,
    );

    expect(getByTestId('custom-test-id')).toBeTruthy();
    expect(getByTestId('custom-test-id-title')).toBeTruthy();
    expect(getByTestId('custom-test-id-description')).toBeTruthy();
  });
});
