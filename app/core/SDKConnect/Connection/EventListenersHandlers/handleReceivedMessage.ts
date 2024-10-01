import { CommunicationLayerMessage } from '@metamask/sdk-communication-layer';
import Logger from '@util/Logger';
import Engine from '@core/Engine';
import { handleConnectionMessage } from '@core/SDKConnect/handlers/handleConnectionMessage';
import { Connection } from '@Connection';

function handleReceivedMessage({ instance }: { instance: Connection }) {
  return async (message: CommunicationLayerMessage) => {
    try {
      await handleConnectionMessage({
        message,
        engine: Engine,
        connection: instance,
      });
    } catch (error) {
      Logger.error(error as Error, 'Connection not initialized');
      throw error;
    }
  };
}

export default handleReceivedMessage;
