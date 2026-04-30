import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SampleCounterPane } from './SampleCounterPane';
import { strings } from '../../../../../../locales/i18n';
import { SAMPLE_FEATURE_EVENTS } from '../../../analytics/events';
import { useAnalytics } from '../../../../../components/hooks/useAnalytics/useAnalytics';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const mockIncrement = jest.fn();

jest.mock('../../hooks/useSampleCounter/useSampleCounter', () => ({
  __esModule: true,
  useSampleCounter: () => ({
    count: 42,
    incrementCount: mockIncrement,
  }),
}));

const mockAnalytics = jest.mocked(useAnalytics)();

describe('SampleCounterPane', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(mockAnalytics.trackEvent).toHaveBeenCalled();
      expect(mockAnalytics.createEventBuilder).toHaveBeenCalledWith(
        SAMPLE_FEATURE_EVENTS.COUNTER_INCREMENTED,
      );
    });
  });
});
