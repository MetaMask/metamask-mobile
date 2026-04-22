import { Transform } from 'readable-stream';
import { Duration, inMilliseconds, type JsonRpcRequest } from '@metamask/utils';

export const THREE_MINUTES = inMilliseconds(3, Duration.Minute);

/**
 * Creates a set abstraction whose values expire after three minutes.
 *
 * @returns The expiry set.
 */
const makeExpirySet = () => {
  const map: Map<string | number | null, number> = new Map();

  const timerId = setInterval(() => {
    const cutoffTime = Date.now() - THREE_MINUTES;

    for (const [id, timestamp] of map.entries()) {
      if (timestamp <= cutoffTime) {
        map.delete(id);
      } else {
        break;
      }
    }
  }, THREE_MINUTES);

  return {
    /**
     * Attempts to add a value to the set.
     *
     * @param value - The value to add.
     * @returns `true` if the value was added, and `false` if it already existed.
     */
    add(value: string | number | null) {
      if (!map.has(value)) {
        map.set(value, Date.now());
        return true;
      }
      return false;
    },

    /**
     * Clear the map and tear down the underlying timer.
     */
    destroy() {
      map.clear();
      clearInterval(timerId);
    },
  };
};

/**
 * JSON-RPC request deduper. Extends Transform and overrides `_destroy` so we
 * do not pass `options.destroy` into the constructor: readable-stream assigns
 * that to `this._destroy`, which replaces Transform's default teardown and
 * causes pump/end-of-stream to report "premature close" when the bridge tears
 * down.
 */
class DupeReqFilterTransform extends Transform {
  private readonly seenRequestIds = makeExpirySet();

  constructor() {
    super({ objectMode: true });
  }

  _transform(
    chunk: JsonRpcRequest,
    _encoding: BufferEncoding,
    cb: (error?: Error | null, data?: JsonRpcRequest) => void,
  ): void {
    // JSON-RPC notifications have no ids; our only recourse is to let them through.
    const hasNoId = chunk.id === undefined;
    const requestNotYetSeen = this.seenRequestIds.add(chunk.id);

    if (hasNoId || requestNotYetSeen) {
      cb(null, chunk);
    } else {
      cb();
    }
  }

  _destroy(error: Error | null, callback: (error: Error | null) => void): void {
    this.seenRequestIds.destroy();
    super._destroy(error, callback);
  }
}

/**
 * Returns a transform stream that filters out requests whose ids we've already seen.
 * Ignores JSON-RPC notifications, i.e. requests with an `undefined` id.
 *
 * @returns The stream object.
 */
export default function createDupeReqFilterStream(): DupeReqFilterTransform {
  return new DupeReqFilterTransform();
}
