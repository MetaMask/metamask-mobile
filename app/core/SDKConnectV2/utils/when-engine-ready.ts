import Engine from '../../Engine';
import { isE2E } from '../../../util/test/utils';

const isEngineReady = (): boolean => {
  try {
    if (Engine.context) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// Use shorter polling interval during E2E tests to reduce pending timers
const POLL_INTERVAL = isE2E ? 10 : 100;

export async function whenEngineReady() {
  while (!isEngineReady()) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
}
