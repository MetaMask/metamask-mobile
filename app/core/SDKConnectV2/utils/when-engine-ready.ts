import Engine from '../../Engine';

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

export async function whenEngineReady() {
  while (!isEngineReady()) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
