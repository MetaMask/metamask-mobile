import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SampleCounterPane } from './SampleCounterPane';
import { strings } from '../../../../../../locales/i18n';
import useMetrics from '../../../../../components/hooks/useMetrics/useMetrics';
import { SAMPLE_FEATURE_EVENTS } from '../../../analytics/events';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder.ts';

/**
 * Mock implementation for react-native Linking module
 * Required for testing components that use deep linking functionality
 */
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

/**
 * Mock implementation of the increment function
 * Used to verify counter increment functionality
 */
const mockIncrement = jest.fn();

/**
 * Mock implementation of the useSampleCounter hook
 * Provides a controlled test environment for the counter functionality
 */
jest.mock('../../hooks/useSampleCounter/useSampleCounter', () => ({
  __esModule: true,
  useSampleCounter: () => ({
    count: 42,
    incrementCount: mockIncrement,
  }),
}));

jest.mock('../../../../../components/hooks/useMetrics/useMetrics');

const mockTrackEvent = jest.fn();

/**
 * Test suite for SampleCounterPane component
 *
 * @group Components
 * @group SampleCounterPane
 */
describe('SampleCounterPane', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
      getDeleteRegulationId: jest.fn(),
      isDataRecorded: jest.fn(),
      isEnabled: jest.fn(),
      getMetaMetricsId: jest.fn(),
    });
  });

  /**
   * Verifies that the component renders correctly and matches the snapshot
   *
   * @test
   */
  it('matches rendered snapshot', () => {
    const { toJSON } = renderWithProvider(<SampleCounterPane />);
    expect(toJSON()).toMatchSnapshot();
  });

  /**
   * Verifies that the counter value is displayed correctly
   *
   * @test
   */
  it('displays counter value', () => {
    const { getByTestId } = renderWithProvider(<SampleCounterPane />);
    const valueElement = getByTestId('sample-counter-pane-value');

    expect(valueElement).toBeDefined();
    expect(valueElement.props.children).toBe(
      strings('sample_feature.counter.value', { value: 42 }),
    );
  });

  /**
   * Verifies that the increment button correctly triggers the counter increment
   *
   * @test
   */
  it('calls incrementCount when increment button is pressed', async () => {
    const { getByTestId } = renderWithProvider(<SampleCounterPane />);

    fireEvent.press(getByTestId('sample-counter-pane-increment-button'));

    await waitFor(() => {
      expect(mockIncrement).toHaveBeenCalledTimes(1);
    });
  });

  it('calls trackEvent when increment button is pressed', async () => {
    const { getByTestId } = renderWithProvider(<SampleCounterPane />);

    fireEvent.press(getByTestId('sample-counter-pane-increment-button'));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: SAMPLE_FEATURE_EVENTS.COUNTER_INCREMENTED.category,
        }),
      );
    });
  });
});
