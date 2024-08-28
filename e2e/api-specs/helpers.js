import TestHelpers from '../helpers';
import { v4 as uuid } from 'uuid';

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

const pollResult = async (driver, generatedKey) => {
  let result;
  // eslint-disable-next-line no-loop-func
  await new Promise((resolve, reject) => {
    addToQueue({
      name: 'pollResult',
      task: async () => {
        await TestHelpers.delay(500);
        const text = await driver.runScript(
          (el, g) => window[g],
          [generatedKey],
        );
        if (typeof text === 'string') {
          result = JSON.parse(text);
        } else {
          result = text;
        }
        if (result !== undefined) {
          await driver.runScript(
            (el, g) => {
              delete window[g];
            },
            [generatedKey],
          );
        }
        return result;
      },
      resolve,
      reject,
    });
  });
  if (result !== undefined) {
    return result;
  }
  return pollResult(driver, generatedKey);
};

const runEthereumRequest = async (driver, method, params, generatedKey) => {
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
};

const executeTransportTask = async (driver, method, params, generatedKey) => {
  await addToQueue({
    name: 'transport',
    task: async () => {
      await runEthereumRequest(driver, method, params, generatedKey);
    },
    resolve: null,
    reject: null,
  });
};

export const createDriverTransport = (driver) => async (_, method, params) => {
  const generatedKey = uuid();
  await executeTransportTask(driver, method, params, generatedKey);
  return pollResult(driver, generatedKey);
};
