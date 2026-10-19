import React from 'react';
import { render } from '@testing-library/react-native';
import CliLoginPushNudgeListener from './CliLoginPushNudgeListener';

const mockNewUserSheet = jest.fn();
const mockUseCliLoginPushNudge = jest.fn();

jest.mock(
  '../../Views/Notifications/PushNotificationOnboarding/NewUserSheet',
  () => ({
    __esModule: true,
    default: (props: unknown) => {
      mockNewUserSheet(props);
      return null;
    },
  }),
);

jest.mock('./useCliLoginPushNudge', () => ({
  useCliLoginPushNudge: () => mockUseCliLoginPushNudge(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('CliLoginPushNudgeListener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCliLoginPushNudge.mockReturnValue({
      isVisible: true,
      onYes: jest.fn(),
      onNotNow: jest.fn(),
      onClose: jest.fn(),
    });
  });

  it('uses the CLI-specific copy and notification preview', () => {
    render(<CliLoginPushNudgeListener />);

    expect(mockNewUserSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        testID: 'cli-login-push-nudge',
        title: 'sdk_connect_v2.push_nudge.title',
        body: 'sdk_connect_v2.push_nudge.description',
        yesLabel: 'sdk_connect_v2.push_nudge.turn_on_button',
        previewTitle: 'sdk_connect_v2.push_nudge.preview_title',
        previewMessage: 'sdk_connect_v2.push_nudge.preview_message',
        previewTimestamp: 'sdk_connect_v2.push_nudge.preview_timestamp',
      }),
    );
  });
});
