import { KeyringController } from '@metamask/keyring-controller';

export const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const waitForKeychainUnlocked = async ({
  keyringController,
}: {
  keyringController: KeyringController;
}) => {
  let i = 0;
  while (!keyringController.isUnlocked()) {
    await new Promise<void>((res) => setTimeout(() => res(), 600));
    if (i++ > 60) break;
  }
};

let rpcQueue: { [id: string]: string } = {};
export const waitForEmptyRPCQueue = async () => {
  let i = 0;
  let queue = Object.keys(rpcQueue);
  while (queue.length > 0) {
    await new Promise<void>((res) => setTimeout(() => res(), 1000));
    queue = Object.keys(rpcQueue);
    if (i++ > 30) {
      break;
    }
  }
};

export const addToRpcQeue = ({
  id,
  method,
}: {
  id: string;
  method: string;
}) => {
  rpcQueue[id] = method;
};

export const resetRPCQueue = () => {
  rpcQueue = {};
};

export const removeFromRPCQueue = (id: string) => {
  delete rpcQueue[id];
};
