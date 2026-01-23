import { getLocalHost } from './FixtureUtils.ts';
import Koa, { Context } from 'koa';
import { isObject, mapValues } from 'lodash';
import FixtureBuilder from './FixtureBuilder.ts';
import { createLogger } from '../logger.ts';
import { Resource, ServerStatus } from '../types.ts';
import PortManager, { ResourceType } from '../PortManager.ts';

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

class FixtureServer implements Resource {
  private _app: Koa;
  private _stateMap: Map<string, object>;
  private _server: ReturnType<Koa['listen']> | null;
  _serverPort: number;
  _serverStatus: ServerStatus = ServerStatus.STOPPED;

  constructor() {
    this._app = new Koa();
    this._stateMap = new Map([[DEFAULT_STATE_KEY, Object.create(null)]]);
    this._serverPort = 0; // will be set with setServerPort()
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
   * Get the status of the fixture server
   * @returns The status of the fixture server
   */
  get serverStatus() {
    return this._serverStatus;
  }

  /**
   *
   * @returns Whether the fixture server is started
   */
  isStarted(): boolean {
    return this._serverStatus === ServerStatus.STARTED;
  }

  /**
   * Get the port the fixture server is running on
   * @returns The port the fixture server is running on
   */
  getServerPort(): number {
    return this._serverPort;
  }

  /**
   * Get the status of the fixture server
   * @returns The status of the fixture server
   */
  getServerStatus(): ServerStatus {
    return this._serverStatus;
  }

  /**
   * Set the server port (called by PortManager before start)
   * @param port - The port number to use
   */
  setServerPort(port: number): void {
    this._serverPort = port;
  }

  /**
   * Get the URL of the fixture server
   * @returns
   */
  get getServerUrl(): string {
    return `http://${getLocalHost()}:${this._serverPort}/state.json`;
  }

  // Start the fixture server
  async start(): Promise<void> {
    if (this._serverStatus === ServerStatus.STARTED) {
      logger.debug('The fixture server has already been started');
      return;
    }

    const options = {
      host: getLocalHost(),
      port: this._serverPort,
      exclusive: true,
    };

    await new Promise<void>((resolve, reject) => {
      logger.debug(`Starting fixture server on port ${this._serverPort}`);
      this._server = this._app.listen(options);
      if (!this._server) {
        throw new Error('Failed to start fixture server');
      }
      let onError: ((err: unknown) => void) | null = null;
      let onListening: (() => void) | null = null;
      onError = (err: unknown) => {
        if (onListening) {
          this._server?.removeListener('listening', onListening);
        }
        reject(err);
      };
      onListening = () => {
        if (onError) {
          this._server?.removeListener('error', onError);
        }
        this._serverStatus = ServerStatus.STARTED;
        resolve(undefined);
      };
      this._server.once('error', onError);
      this._server.once('listening', onListening);
    });
  }
  // Stop the fixture server
  async stop(): Promise<void> {
    logger.debug(`Stopping fixture server on port ${this._serverPort}`);
    if (this._serverStatus === ServerStatus.STOPPED || !this._server) {
      logger.debug('The fixture server has already been stopped');
      return;
    }

    await new Promise((resolve, reject) => {
      const serverRef = this._server;
      if (!serverRef) {
        this._serverStatus = ServerStatus.STOPPED;
        resolve(undefined);
        return;
      }
      let onError: ((err: unknown) => void) | null = null;
      let onClose: (() => void) | null = null;
      onError = (err: unknown) => {
        if (onClose) {
          serverRef.removeListener('close', onClose);
        }
        reject(err);
      };
      onClose = () => {
        if (onError) {
          serverRef.removeListener('error', onError);
        }
        this._server = null;
        this._serverStatus = ServerStatus.STOPPED;
        // Release the port after server is stopped
        PortManager.getInstance().releasePort(ResourceType.FIXTURE_SERVER);
        resolve(undefined);
      };
      serverRef.once('error', onError);
      serverRef.once('close', onClose);
      serverRef.close();
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
