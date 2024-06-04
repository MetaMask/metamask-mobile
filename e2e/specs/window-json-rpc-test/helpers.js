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
}
