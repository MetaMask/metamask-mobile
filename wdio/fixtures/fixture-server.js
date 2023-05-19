const Koa = require('koa');
const { isObject, mapValues } = require('lodash');

const CURRENT_STATE_KEY = '__CURRENT__';
const DEFAULT_STATE_KEY = '__DEFAULT__';

const FIXTURE_SERVER_HOST = 'localhost';
const FIXTURE_SERVER_PORT = 12345;

const fixtureSubstitutionPrefix = '__FIXTURE_SUBSTITUTION__';
const CONTRACT_KEY = 'CONTRACT';
const fixtureSubstitutionCommands = {
  currentDateInMilliseconds: 'currentDateInMilliseconds',
};

/**
 * Perform substitutions on a single piece of state.
 *
 * @param {unknown} partialState - The piece of state to perform substitutions on.
 * @param {object} contractRegistry - The smart contract registry.
 * @returns {unknown} The partial state with substitutions performed.
 */
function performSubstitution(partialState, contractRegistry) {
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
      return contractRegistry.getContractAddress(contract);
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
function performStateSubstitutions(rawState, contractRegistry) {
  return mapValues(rawState, (item) => {
    return performSubstitution(item, contractRegistry);
  });
}

class FixtureServer {
  constructor() {
    this._app = new Koa();
    this._stateMap = new Map([[DEFAULT_STATE_KEY, Object.create(null)]]);

    this._app.use(async (ctx) => {
      // Middleware to handle requests
      ctx.set('Access-Control-Allow-Origin', '*');
      ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      // Check if it's a request for the current state
      if (this._isStateRequest(ctx)) {
        ctx.body = this._stateMap.get(CURRENT_STATE_KEY);
      }
    });
  }

  // Start the fixture server
  async start() {
    const options = {
      host: FIXTURE_SERVER_HOST,
      port: FIXTURE_SERVER_PORT,
      exclusive: true,
    };

    return new Promise((resolve, reject) => {
      console.log('Starting fixture server...')
      this._server = this._app.listen(options);
      this._server.once('error', reject);
      this._server.once('listening', resolve);
    });
  }
  // Stop the fixture server
  async stop() {
    if (!this._server) {
      return;
    }
    
    await new Promise((resolve, reject) => {
      console.log('Stopping fixture server...')
      this._server.close();
      this._server.once('error', reject);
      this._server.once('close', resolve);
    });
  }
  // Load JSON state into the server
  loadJsonState(rawState, contractRegistry) {
    console.log('Loading JSON state...')
    const state = performStateSubstitutions(rawState, contractRegistry);
    this._stateMap.set(CURRENT_STATE_KEY, state);
    console.log('JSON state loaded')

  }
  // Check if the request is for the current state
  _isStateRequest(ctx) {
    return ctx.method === 'GET' && ctx.path === '/init-state.json';
  }
}

module.exports = FixtureServer;
