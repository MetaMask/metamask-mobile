function serializeError(error) {
  const serialized = {};
  Object.getOwnPropertyNames(error).forEach((key) => {
    serialized[key] = error[key];
  });
  return serialized;
}

function deserializeError(data) {
  const error = new Error(data.message);
  Object.getOwnPropertyNames(data).forEach((key) => {
    error[key] = data[key];
  });
  return error;
}

export default (invoke) => {
  invoke.defineAsync = (name, func) => {
    const resolveCallback = invoke.bind(`${name}_resolve`);
    const rejectCallback = invoke.bind(`${name}_reject`);

    invoke.define(`${name}_trigger`, ({ id, args }) => {
      func(...args)
        .then((...args) => resolveCallback({ id, args }))
        .catch((e) => rejectCallback({ id, error: serializeError(e) }));
    });
  };

  invoke.bindAsync = (name) => {
    const callbacks = {};
    const trigger = invoke.bind(`${name}_trigger`);

    invoke.define(`${name}_resolve`, ({ id, args }) => {
      const { resolve } = callbacks[id];
      delete callbacks[id];
      resolve(...args);
    });

    invoke.define(`${name}_reject`, ({ id, error }) => {
      const { reject } = callbacks[id];
      delete callbacks[id];
      reject(deserializeError(error));
    });

    return (...args) => {
      const id = Math.random().toString(36).substring(2, 15);
      return new Promise((resolve, reject) => {
        callbacks[id] = { resolve, reject };
        trigger({ id, args }).catch(reject);
      });
    };
  };
};
