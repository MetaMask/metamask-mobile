import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import NotificationsDeveloperOptionsSection from './NotificationsDeveloperOptionsSection';
import { resetPushPrePromptShown } from '../../../../util/notifications/constants/notification-storage-keys';

jest.mock(
  '../../../../util/notifications/constants/notification-storage-keys',
  () => ({
    resetPushPrePromptShown: jest.fn().mockResolvedValue(undefined),
  }),
);

const mockResetPushPrePromptShown = jest.mocked(resetPushPrePromptShown);

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
