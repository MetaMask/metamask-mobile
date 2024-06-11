import TestHelpers from '../helpers';
import {v4 as uuid} from "uuid";

export const taskQueue = [];
let isProcessing = false;

export const processQueue = async () => {
  if (isProcessing || taskQueue.length === 0) return;

  isProcessing = true;
  const { task, resolve, reject, name } = taskQueue.shift();
  try {
    console.log('processing', name);
    const startTime = Date.now();
    const result = await task();
    console.log('processed', name, Date.now() - startTime, 'ms');
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

const pollResult = async (driver, generatedKey) => {
  let result;
  // eslint-disable-next-line no-loop-func
  await new Promise((resolve, reject) => {
    addToQueue({
      name: 'pollResult',
      task: async () => {
        await TestHelpers.delay(500);
        const text = await driver.runScript((el, g) => window[g], [generatedKey]);
        if (typeof text === 'string') {
          result = JSON.parse(text);
        } else {
          result = text;
        }
        if (result) {
          await driver.runScript((el, g) => {
            delete window[g];
          }, [generatedKey]);
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

export const createDriverTransport = (driver) => (_, method, params) => {
  console.log('starting transport call', method, params)
  const generatedKey = uuid();
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const execute = async () => {
      await addToQueue({
        name: 'transport',
        task: async () => {
          await driver.runScript(
            (el, m, p, g) => {
              window.ethereum
                .request({ method: m, params: p })
                .then((res) => {
                  window[g] = JSON.stringify({
                    result: res,
                  });
                })
                .catch((err) => {
                  window[g] = JSON.stringify({
                    error: {
                      code: err.code,
                      message: err.message,
                      data: err.data,
                    },
                  });
                });
            },
            [method, params, generatedKey],
          );
        },
        resolve,
        reject,
      });
    };
    return execute();
  }).then(async () => {
    const result = await pollResult(driver, generatedKey);
    console.log('transport execution time', Date.now() - startTime, 'ms', method, params);
    return result;
  });
}
