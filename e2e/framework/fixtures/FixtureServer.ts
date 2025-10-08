import { getFixturesServerPort, getLocalHost } from './FixtureUtils';
import Koa, { Context } from 'koa';
import { isObject, mapValues } from 'lodash';
import FixtureBuilder from './FixtureBuilder';
import { createLogger } from '../logger';

const logger = createLogger({
  name: 'FixtureServer',
});

const CURRENT_STATE_KEY = '__CURRENT__';
const DEFAULT_STATE_KEY = '__DEFAULT__';

const fixtureSubstitutionPrefix = '__FIXTURE_SUBSTITUTION__';
const CONTRACT_KEY = 'CONTRACT';
const fixtureSubstitutionCommands = {
  currentDateInMilliseconds: 'currentDateInMilliseconds',
};

/**
 * Interface for contract registry objects
 */
interface ContractRegistry {
  getContractAddress(contractName: string): string | unknown;
}

/**
 * Perform substitutions on a single piece of state.
 *
 * @param {unknown} partialState - The piece of state to perform substitutions on.
 * @param {object} contractRegistry - The smart contract registry.
 * @returns {unknown} The partial state with substitutions performed.
 */
function performSubstitution(
  partialState: unknown,
  contractRegistry: object,
): unknown {
  if (Array.isArray(partialState)) {
    return partialState.map((item) =>
      performSubstitution(item, contractRegistry),
    );
  } else if (isObject(partialState)) {
    return mapValues(partialState, (item) =>
      performSubstitution(item, contractRegistry),
    );
  } else if (
    typeof partialState === 'string' &&
    partialState.startsWith(fixtureSubstitutionPrefix)
  ) {
    const substitutionCommand = partialState.substring(
      fixtureSubstitutionPrefix.length,
    );
    if (
      substitutionCommand ===
      fixtureSubstitutionCommands.currentDateInMilliseconds
    ) {
      return new Date().getTime();
    } else if (partialState.includes(CONTRACT_KEY)) {
      const contract = partialState.split(CONTRACT_KEY).pop();
      return (contractRegistry as ContractRegistry).getContractAddress(
        contract as string,
      );
    }
    throw new Error(`Unknown substitution command: ${substitutionCommand}`);
  }
  return partialState;
}

/**
 * Substitute values in the state fixture.
 *
 * @param {object} rawState - The state fixture.
 * @param {object} contractRegistry - The smart contract registry.
 * @returns {object} The state fixture with substitutions performed.
 */
function performStateSubstitutions(
  rawState: object,
  contractRegistry: object,
): object {
  return mapValues(rawState, (item) =>
    performSubstitution(item, contractRegistry),
  );
}

export enum ServerStatus {
  STOPPED = 'stopped',
  STARTED = 'started',
}

class FixtureServer {
  private _app: Koa;
  private _stateMap: Map<string, object>;
  private _server: ReturnType<Koa['listen']> | null;
  private _port: number;
  private _serverStatus: ServerStatus = ServerStatus.STOPPED;

  constructor() {
    this._app = new Koa();
    this._stateMap = new Map([[DEFAULT_STATE_KEY, Object.create(null)]]);
    this._port = getFixturesServerPort();
    this._server = null;
    this._serverStatus = ServerStatus.STOPPED;
    this._app.use(async (ctx: Context) => {
      // Middleware to handle requests
      ctx.set('Access-Control-Allow-Origin', '*');
      ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      ctx.set(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
      );
      // Check if it's a request for the current state
      if (this._isStateRequest(ctx)) {
        ctx.body = this._stateMap.get(CURRENT_STATE_KEY);
      }
    });
  }

  /**
   * Get the port the fixture server is running on
   * @returns The port the fixture server is running on
   */
  get port() {
    return this._port;
  }

  /**
   * Get the status of the fixture server
   * @returns The status of the fixture server
   */
  get serverStatus() {
    return this._serverStatus;
  }

  /**
   *
   * @returns
   */
  get fixtureServerUrl() {
    return `http://${getLocalHost()}:${this.port}/state.json`;
  }

  // Start the fixture server
  async start() {
    const options = {
      host: getLocalHost(),
      port: this.port,
      exclusive: true,
    };

    return new Promise((resolve, reject) => {
      logger.debug(`Starting fixture server on port ${this.port}`);
      this._server = this._app.listen(options);
      if (!this._server) {
        throw new Error('Failed to start fixture server');
      }
      this._server.once('error', reject);
      this._server.once('listening', resolve);
      this._serverStatus = ServerStatus.STARTED;
    });
  }
  // Stop the fixture server
  async stop() {
    if (this._serverStatus === ServerStatus.STOPPED) {
      return;
    }

    await new Promise((resolve, reject) => {
      logger.debug(`Stopping fixture server on port ${this.port}`);
      if (this._serverStatus === ServerStatus.STOPPED) {
        throw new Error('Failed to stop fixture server');
      }
      this._server?.close();
      this._server?.once('error', reject);
      this._server?.once('close', resolve);
      this._server = null;
      this._serverStatus = ServerStatus.STOPPED;
    });
  }
  // Load JSON state into the server
  loadJsonState(
    rawState: FixtureBuilder,
    contractRegistry: ContractRegistry | null,
  ) {
    logger.debug('Loading JSON state...');
    const state = performStateSubstitutions(rawState, contractRegistry || {});
    this._stateMap.set(CURRENT_STATE_KEY, state);
    logger.debug('JSON state loaded');
  }
  // Check if the request is for the current state
  private _isStateRequest(ctx: Context) {
    return ctx.method === 'GET' && ctx.path === '/state.json';
  }
}

export default FixtureServer;
