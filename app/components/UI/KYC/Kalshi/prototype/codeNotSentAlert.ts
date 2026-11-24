// PROTOTYPE-DO-NOT-MERGE
// Paper screens: KP-13, KP-15 (see prototypeScreens.ts)
import { Alert } from 'react-native';
import { PROTOTYPE_COPY } from './prototypeConstants';

/**
 * Runs a Kalshi code send; when it fails, shows the native "Couldn't send
 * your code" dialog, whose Try again sends again. Never rejects, so the
 * screens stay where they are.
 * @returns Whether this attempt sent the code.
 *
 * @param channel - Where the code was going.
 * @param send - The send to run (and re-run on Try again).
 */
export const sendCodeWithRetryDialog = async (
  channel: 'email' | 'phone',
  send: () => Promise<void>,
): Promise<boolean> => {
  try {
    await send();
    return true;
  } catch {
    const copy = PROTOTYPE_COPY.codeNotSent;
    Alert.alert(copy.title, copy[channel], [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.tryAgain,
        style: 'default',
        isPreferred: true,
        onPress: () => {
          sendCodeWithRetryDialog(channel, send);
        },
      },
    ]);
    return false;
  }
};
