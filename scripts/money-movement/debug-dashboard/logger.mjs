import { mkdir, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Append-only JSONL logger with serialized writes so lines never interleave.
 *
 * @param logFilePath - Absolute path to the .jsonl file.
 */
export function createSessionLogger(logFilePath) {
  let chain = Promise.resolve();

  function appendLine(record) {
    const line = `${JSON.stringify(record)}\n`;
    chain = chain
      .then(() => appendFile(logFilePath, line, { encoding: 'utf-8' }))
      .catch((err) => {
        console.error('[ramps-debug] Failed to write log line:', err.message);
      });
    return chain;
  }

  return {
    /**
     * @param {Record<string, unknown>} record - Payload (must be JSON-serializable).
     */
    log(record) {
      return appendLine({
        ...record,
        _serverReceivedAt: Date.now(),
      });
    },

    async ensureDir() {
      await mkdir(dirname(logFilePath), { recursive: true });
    },
  };
}
