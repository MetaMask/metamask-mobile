import { Alert } from 'react-native';
import { showDevErrorAlert } from './devErrorAlert';

jest.mock('../../../../core/ClipboardManager', () => ({
  __esModule: true,
  default: { setString: jest.fn() },
}));

import ClipboardManager from '../../../../core/ClipboardManager';

describe('showDevErrorAlert', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it.each(['rc', 'exp', 'dev', 'test'])(
    'shows an alert with the stack trace in %s environment',
    (env) => {
      const error = new Error('something went wrong');

      showDevErrorAlert('Test title', error, env);

      expect(alertSpy).toHaveBeenCalledWith(
        'Test title',
        error.stack ?? error.message,
        expect.arrayContaining([
          expect.objectContaining({ text: 'Copy' }),
          expect.objectContaining({ text: 'Dismiss' }),
        ]),
      );
    },
  );

  it('does not show an alert in production', () => {
    showDevErrorAlert(
      'Test title',
      new Error('something went wrong'),
      'production',
    );
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('suppresses the user-denied-signature error', () => {
    const error = new Error(
      'MetaMask Tx Signature: User denied transaction signature.',
    );

    showDevErrorAlert('Test title', error, 'dev');

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('copies the stack trace when the Copy button is pressed', () => {
    const error = new Error('something went wrong');

    showDevErrorAlert('Test title', error, 'dev');

    const buttons = alertSpy.mock.calls[0][2] as {
      text: string;
      onPress?: () => void;
    }[];
    const copyButton = buttons.find((b) => b.text === 'Copy');
    copyButton?.onPress?.();

    expect(ClipboardManager.setString).toHaveBeenCalledWith(
      error.stack ?? error.message,
    );
  });
});
