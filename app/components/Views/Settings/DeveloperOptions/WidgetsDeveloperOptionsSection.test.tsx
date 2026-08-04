import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { strings } from '../../../../../locales/i18n';
import { BalanceLiveActivityService } from '../../../../core/Widgets/BalanceLiveActivityService';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WidgetsDeveloperOptionsSection from './WidgetsDeveloperOptionsSection';

jest.mock('../../../../core/Widgets/BalanceLiveActivityService', () => ({
  BalanceLiveActivityService: {
    isSupported: jest.fn(),
    isRunning: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

const TOGGLE_TEST_ID = 'widgets-dev-balance-live-activity-toggle';

describe('WidgetsDeveloperOptionsSection', () => {
  const mockService = jest.mocked(BalanceLiveActivityService);

  beforeEach(() => {
    jest.clearAllMocks();
    mockService.isSupported.mockReturnValue(true);
    mockService.isRunning.mockReturnValue(false);
    mockService.start.mockResolvedValue(true);
  });

  it('renders nothing on a build that cannot show Live Activities', () => {
    mockService.isSupported.mockReturnValue(false);

    const { queryByTestId } = renderWithProvider(
      <WidgetsDeveloperOptionsSection />,
    );

    expect(queryByTestId(TOGGLE_TEST_ID)).toBeNull();
  });

  it('starts the activity when the button is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <WidgetsDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(TOGGLE_TEST_ID));

    await waitFor(() => expect(mockService.start).toHaveBeenCalledTimes(1));
  });

  it('offers to stop the activity once it is running', async () => {
    const { getByTestId, getByText } = renderWithProvider(
      <WidgetsDeveloperOptionsSection />,
    );
    mockService.isRunning.mockReturnValue(true);

    fireEvent.press(getByTestId(TOGGLE_TEST_ID));
    await waitFor(() =>
      expect(
        getByText(
          strings(
            'app_settings.developer_options.widgets.stop_balance_live_activity',
          ),
        ),
      ).toBeDefined(),
    );

    fireEvent.press(getByTestId(TOGGLE_TEST_ID));

    expect(mockService.stop).toHaveBeenCalledTimes(1);
  });

  it('explains why nothing appeared when iOS refuses the request', async () => {
    mockService.start.mockResolvedValue(false);

    const { getByTestId, getByText } = renderWithProvider(
      <WidgetsDeveloperOptionsSection />,
    );
    fireEvent.press(getByTestId(TOGGLE_TEST_ID));

    await waitFor(() =>
      expect(
        getByText(
          strings('app_settings.developer_options.widgets.start_failed'),
        ),
      ).toBeDefined(),
    );
  });
});
