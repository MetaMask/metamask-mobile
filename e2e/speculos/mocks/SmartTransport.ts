import DeviceInfo from 'react-native-device-info';
import RealTransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import {
  SpeculosHttpTransport,
  SPECULOS_DEVICE_ID,
  SPECULOS_DEVICE_NAME,
} from './SpeculosHttpTransport';

const SPECULOS_HOST = '127.0.0.1';
const SPECULOS_PORT = 5000;
const SPECULOS_PROBE_TIMEOUT_MS = 500;
const SPECULOS_PROBE_APDU = 'B001000000';

export type TransportMode = 'real' | 'speculos';

let cachedMode: TransportMode | null = null;

async function detectMode(): Promise<TransportMode> {
  const isSim = DeviceInfo.isEmulatorSync();
  if (!isSim) return 'real';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SPECULOS_PROBE_TIMEOUT_MS);
    await fetch(`http://${SPECULOS_HOST}:${SPECULOS_PORT}/apdu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: SPECULOS_PROBE_APDU }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return 'speculos';
  } catch {
    return 'real';
  }
}

async function getMode(): Promise<TransportMode> {
  if (cachedMode === null) {
    cachedMode = await detectMode();
  }
  return cachedMode;
}

function isSpeculosMode(): boolean {
  return cachedMode === 'speculos';
}

const SmartTransport = {
  open: async (deviceId: string) => {
    const mode = await getMode();
    if (mode === 'speculos') {
      const transport = new SpeculosHttpTransport(SPECULOS_HOST, SPECULOS_PORT);
      transport.open();
      return transport;
    }
    return RealTransportBLE.open(deviceId);
  },

  listen: (observer: any) => {
    let unsubscribed = false;
    let realSub: { unsubscribe: () => void } | null = null;

    getMode().then((mode) => {
      if (unsubscribed) return;
      if (mode === 'speculos') {
        const timer = setTimeout(() => {
          observer.next?.({
            type: 'add',
            descriptor: { id: SPECULOS_DEVICE_ID, name: SPECULOS_DEVICE_NAME },
          });
        }, 200);
        realSub = { unsubscribe: () => clearTimeout(timer) };
      } else {
        realSub = RealTransportBLE.listen(observer);
      }
    });

    return {
      unsubscribe: () => {
        unsubscribed = true;
        realSub?.unsubscribe();
      },
    };
  },

  observeState: (observer: any) => {
    let unsubscribed = false;
    let realSub: { unsubscribe: () => void } | null = null;

    getMode().then((mode) => {
      if (unsubscribed) return;
      if (mode === 'speculos') {
        observer.next?.({ type: 'PoweredOn', available: true });
        realSub = { unsubscribe: () => {} };
      } else {
        realSub = RealTransportBLE.observeState(observer);
      }
    });

    return {
      unsubscribe: () => {
        unsubscribed = true;
        realSub?.unsubscribe();
      },
    };
  },

  disconnectDevice: async (deviceId: string) => {
    const mode = await getMode();
    if (mode === 'speculos') return;
    return RealTransportBLE.disconnectDevice(deviceId);
  },
};

export default SmartTransport;
