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
});
