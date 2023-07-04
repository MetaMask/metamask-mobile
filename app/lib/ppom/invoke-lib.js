export default (invoke) => {
  invoke.defineAsync = (name, func) => {
    const resolveCallback = invoke.bind(`${name}_resolve`);
    const rejectCallback = invoke.bind(`${name}_reject`);

    invoke.define(`${name}_trigger`, ({ id, args }) => {
      func(...args)
        .then((...args) => resolveCallback({ id, args }))
        .catch((...args) => rejectCallback({ id, args: `${args}` }));
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

    invoke.define(`${name}_reject`, ({ id, args }) => {
      const { reject } = callbacks[id];
      delete callbacks[id];
      reject(new Error(...args));
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
