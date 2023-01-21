import SDKConnect, {
  Connection,
  ConnectionProps,
} from 'app/core/SDKConnect/SDKConnect';
import { useEffect, useState } from 'react';

export interface SDKStatus {
  connected: Connection[];
  connections: ConnectionProps[];
}

// TODO do we want to actually register the hook?
export default function useSDK(): SDKStatus | undefined {
  const [sdkStatus, setSDKStatus] = useState<SDKStatus>();

  useEffect(() => {
    SDKConnect.registerEventListener((_eventName: string) => {
      const _connections = SDKConnect.getConnections();
      const _connected = SDKConnect.getConnected();
      const connectionList = Object.values(_connections);
      const connectedList = Object.values(_connected);
      setSDKStatus({
        connected: connectedList,
        connections: connectionList,
      });
    });
  }, []);

  return sdkStatus;
}
