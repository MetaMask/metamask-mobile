import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import NotificationsDeveloperOptionsSection from './NotificationsDeveloperOptionsSection';
import { resetPushPrePromptShown } from '../../../../util/notifications/constants/notification-storage-keys';
import ClipboardManager from '../../../../core/ClipboardManager';
import {
  clearPushPrePromptPerformanceEvents,
  getPushPrePromptPerformanceReport,
  logPushPrePromptPerformanceReport,
} from '../../../../util/notifications/utils/push-pre-prompt-performance';

jest.mock(
  '../../../../util/notifications/constants/notification-storage-keys',
  () => ({
    resetPushPrePromptShown: jest.fn().mockResolvedValue(undefined),
  }),
);

jest.mock(
  '../../../../util/notifications/utils/push-pre-prompt-performance',
  () => ({
    clearPushPrePromptPerformanceEvents: jest.fn(),
    getPushPrePromptPerformanceReport: jest
      .fn()
      .mockReturnValue('{"events":[]}'),
    logPushPrePromptPerformanceReport: jest.fn(),
  }),
);

jest.mock('../../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

const mockResetPushPrePromptShown = jest.mocked(resetPushPrePromptShown);
const mockClearPushPrePromptPerformanceEvents = jest.mocked(
  clearPushPrePromptPerformanceEvents,
);
const mockGetPushPrePromptPerformanceReport = jest.mocked(
  getPushPrePromptPerformanceReport,
);
const mockLogPushPrePromptPerformanceReport = jest.mocked(
  logPushPrePromptPerformanceReport,
);
const mockClipboardSetString = jest.mocked(ClipboardManager.setString);

describe('NotificationsDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resets the push pre-prompt state when the reset button is pressed', async () => {
    const { getByText } = renderWithProvider(
      <NotificationsDeveloperOptionsSection />,
    );

    fireEvent.press(getByText('Reset push pre-prompt'));

    await waitFor(() => {
      expect(mockResetPushPrePromptShown).toHaveBeenCalledTimes(1);
    });
  });

  it('logs the push pre-prompt timing report', () => {
    const { getByText } = renderWithProvider(
      <NotificationsDeveloperOptionsSection />,
    );

    fireEvent.press(getByText('Log push pre-prompt timings'));

    expect(mockLogPushPrePromptPerformanceReport).toHaveBeenCalledTimes(1);
  });

  it('clears the push pre-prompt timing report', () => {
    const { getByText } = renderWithProvider(
      <NotificationsDeveloperOptionsSection />,
    );

    fireEvent.press(getByText('Clear push pre-prompt timings'));

    expect(mockClearPushPrePromptPerformanceEvents).toHaveBeenCalledTimes(1);
  });

  it('copies the push pre-prompt timing report', async () => {
    const { getByText } = renderWithProvider(
      <NotificationsDeveloperOptionsSection />,
    );

    fireEvent.press(getByText('Copy push pre-prompt timings'));

    await waitFor(() => {
      expect(mockGetPushPrePromptPerformanceReport).toHaveBeenCalledTimes(1);
      expect(mockClipboardSetString).toHaveBeenCalledWith('{"events":[]}');
    });
  });

  it('sets marketing consent on', () => {
    const { getByText, store } = renderWithProvider(
      <NotificationsDeveloperOptionsSection />,
      {
        state: {
          security: {
            dataCollectionForMarketing: false,
          },
        },
      },
    );

    fireEvent.press(getByText('Set marketing consent on'));

    expect(store.getState().security.dataCollectionForMarketing).toBe(true);
  });

  it('sets marketing consent off', () => {
    const { getByText, store } = renderWithProvider(
      <NotificationsDeveloperOptionsSection />,
      {
        state: {
          security: {
            dataCollectionForMarketing: true,
          },
        },
      },
    );

    fireEvent.press(getByText('Set marketing consent off'));

    expect(store.getState().security.dataCollectionForMarketing).toBe(false);
  });
});
