import { MessageType } from '@metamask/sdk-communication-layer';
import Logger from '../../../../util/Logger';
import { Connection } from '../Connection';

function sendAuthorized({
  force,
  instance,
}: {
  force?: boolean;
  instance: Connection;
}) {
  if (instance.authorizedSent && force !== true) {
    // Prevent double sending authorized event.
    return;
  }

  instance.remote
    .sendMessage({ type: MessageType.AUTHORIZED })
    .then(() => {
      instance.authorizedSent = true;
    })
    .catch((err) => {
      Logger.log(err, `sendAuthorized() failed to send 'authorized'`);
    });
}

export default sendAuthorized;
