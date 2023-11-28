import CryptoJS from 'crypto-js';

function generateRandomNumber() {
  const range = 1000;
  const randomBytes = CryptoJS.lib.WordArray.random(range);
  const randomNumber = randomBytes.words[0] % range;
  return randomNumber;
}

function serializeError(error: any) {
  const serialized: Record<string, unknown> = {};
  Object.getOwnPropertyNames(error).forEach((key) => {
    serialized[key] = error[key];
  });
  return serialized;
}

function deserializeError(data: any) {
  const error: any = new Error(data.message);
  Object.getOwnPropertyNames(data).forEach((key) => {
    error[key] = data[key];
  });
  return error;
}

export default (invoke: any) => {
  invoke.defineAsync = (name: string, func: (...args: any) => Promise<any>) => {
    const resolveCallback = invoke.bind(`${name}_resolve`);
    const rejectCallback = invoke.bind(`${name}_reject`);

    invoke.define(`${name}_trigger`, ({ id, args }: any) => {
      func(...args)
        .then((...args2: any[]) => resolveCallback({ id, args: args2 }))
        .catch((e: Error) => rejectCallback({ id, error: serializeError(e) }));
    });
  };

  invoke.bindAsync = (name: string) => {
    const callbacks: Record<any, any> = {};
    const trigger = invoke.bind(`${name}_trigger`);

    invoke.define(`${name}_resolve`, ({ id, args }: any) => {
      const { resolve } = callbacks[id];
      delete callbacks[id];
      resolve(...args);
    });

    invoke.define(`${name}_reject`, ({ id, error }: any) => {
      const { reject } = callbacks[id];
      delete callbacks[id];
      reject(deserializeError(error));
    });

    return (...args: any) => {
      const id = generateRandomNumber();
      return new Promise((resolve, reject) => {
        callbacks[id] = { resolve, reject };
        trigger({ id, args }).catch(reject);
      });
    };
  };
};
