import TestHelpers from '../helpers';
export const taskQueue = [];
let isProcessing = false;

export const processQueue = async () => {
  if (isProcessing || taskQueue.length === 0) return;

  isProcessing = true;
  const { task, resolve, reject } = taskQueue.shift();
  try {
    const result = await task();
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    isProcessing = false;
    await processQueue();
  }
};

export const addToQueue = ({ task, resolve, reject, name }) => {
  taskQueue.push({ task, resolve, reject, name });
  return processQueue();
};

const pollResult = async (driver) => {
  let result;
  await TestHelpers.delay(500);
  console.log('poll result driver', driver)
  // eslint-disable-next-line no-loop-func
  await new Promise((resolve, reject) => {
    addToQueue({
      name: 'pollResult',
      task: async () => {
        console.log('poll result 2 driver', driver)
        const text = await driver.runScript((el) => window.JSONRPCResponse);
        if (typeof text === 'string') {
          result = JSON.parse(text);
        } else {
          result = text;
        }
        return result;
      },
      resolve,
      reject,
    });
  });
  if (result) {
    return result;
  }
  return pollResult(driver);
};

export const createDriverTransport = (driver) => (_, method, params) =>
  new Promise((resolve, reject) => {
    const execute = async () => {
      await addToQueue({
        name: 'transport',
        task: async () => {
          await driver.runScript(
            (el, m, p) => {
              window.ethereum
                .request({ method: m, params: p })
                .then((res) => {
                  window.JSONRPCResponse = JSON.stringify({
                    result: res,
                  });
                })
                .catch((err) => {
                  window.JSONRPCResponse = JSON.stringify({
                    error: {
                      code: err.code,
                      message: err.message,
                      data: err.data,
                    },
                  });
                });
            },
            [method, params],
          );
        },
        resolve,
        reject,
      });
    };
    return execute();
  }).then(async () => {
    console.log('about to call pollREsult with driver', driver);
    const result = await pollResult(driver);
    await new Promise((resolve, reject) => {
      addToQueue({
        name: 'clearJSONRPCResponse',
        task: async () => {
          await driver.runScript((el) => {
            window.JSONRPCResponse = null;
          });
        },
        resolve,
        reject,
      });
    });
    return result;
  });
