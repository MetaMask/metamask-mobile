/* eslint-disable no-console */
import { getFixturesServerPort } from './utils';
import Koa from 'koa';
import { isObject, mapValues } from 'lodash';

const CURRENT_STATE_KEY = '__CURRENT__';
const DEFAULT_STATE_KEY = '__DEFAULT__';

const FIXTURE_SERVER_HOST = 'localhost';
export const DEFAULT_FIXTURE_SERVER_PORT = 12345;

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
  return mapValues(rawState, (item) =>
    performSubstitution(item, contractRegistry),
  );
}

class FixtureServer {
  constructor() {
    this._app = new Koa();
    this._stateMap = new Map([[DEFAULT_STATE_KEY, Object.create(null)]]);
    
    // Performance data storage
    this._performanceData = {
      metrics: [],
      session: {
        sessionId: '',
        startTime: 0,
        environment: {
          branch: '',
          commitHash: '',
          platform: '',
          appVersion: '',
        },
      },
    };

    // Add body parsing middleware
    this._app.use(async (ctx, next) => {
      if (ctx.method === 'POST' && ctx.path === '/performance') {
        const body = await new Promise((resolve) => {
          let data = '';
          ctx.req.on('data', (chunk) => {
            data += chunk.toString();
          });
          ctx.req.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              resolve({});
            }
          });
        });
        ctx.request.body = body;
      }
      await next();
    });

    this._app.use(async (ctx) => {
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
      // Check if it's a performance data request
      else if (this._isPerformanceRequest(ctx)) {
        ctx.body = this._performanceData;
      }
      // Check if it's a performance data submission
      else if (this._isPerformanceSubmission(ctx)) {
        await this._handlePerformanceSubmission(ctx);
      }
      // Check if it's a performance data clear request
      else if (this._isPerformanceClearRequest(ctx)) {
        this._clearPerformanceData();
        ctx.body = { success: true };
      }
    });
  }

  // Start the fixture server
  async start() {
    const options = {
      host: FIXTURE_SERVER_HOST,
      port: getFixturesServerPort(),
      exclusive: true,
    };

    return new Promise((resolve, reject) => {
      console.log('Starting fixture server...');
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
      console.log('Stopping fixture server...');
      this._server.close();
      this._server.once('error', reject);
      this._server.once('close', resolve);
      this._server = undefined;
    });
  }
  // Load JSON state into the server
  loadJsonState(rawState, contractRegistry) {
    console.log('Loading JSON state...');
    const state = performStateSubstitutions(rawState, contractRegistry);
    this._stateMap.set(CURRENT_STATE_KEY, state);
    console.log('JSON state loaded');
  }
  // Check if the request is for the current state
  _isStateRequest(ctx) {
    return ctx.method === 'GET' && ctx.path === '/state.json';
  }
  
  // Check if the request is for performance data
  _isPerformanceRequest(ctx) {
    return ctx.method === 'GET' && ctx.path === '/performance.json';
  }
  
  // Check if the request is for performance data submission
  _isPerformanceSubmission(ctx) {
    return ctx.method === 'POST' && ctx.path === '/performance';
  }
  
  // Check if the request is for clearing performance data
  _isPerformanceClearRequest(ctx) {
    return ctx.method === 'DELETE' && ctx.path === '/performance';
  }
  
  // Handle performance data submission
  async _handlePerformanceSubmission(ctx) {
    try {
      const body = ctx.request.body;
      
      if (body.metric) {
        // Preserve precise timing data
        const metric = {
          ...body.metric,
          timestamp: Number(body.metric.timestamp),
          duration: Number(body.metric.duration),
        };
        
        this._performanceData.metrics.push(metric);
        console.log(`📊 Performance metric added: ${metric.eventName} (${metric.duration.toFixed(3)}ms)`);
        console.log(`   Timestamp: ${metric.timestamp.toFixed(3)}ms`);
        console.log(`   Duration: ${metric.duration.toFixed(3)}ms`);
      } else if (body.session) {
        // Update session data with precise timing
        const session = {
          ...body.session,
          startTime: Number(body.session.startTime),
        };
        
        this._performanceData.session = { ...this._performanceData.session, ...session };
        console.log(`📊 Performance session updated: ${session.sessionId}`);
        console.log(`   Start time: ${session.startTime.toFixed(3)}ms`);
      } else if (body.metrics) {
        // Replace all metrics with precise timing
        const metrics = body.metrics.map(metric => ({
          ...metric,
          timestamp: Number(metric.timestamp),
          duration: Number(metric.duration),
        }));
        
        this._performanceData.metrics = metrics;
        console.log(`📊 Performance metrics replaced: ${metrics.length} metrics`);
        metrics.forEach(metric => {
          console.log(`   ${metric.eventName}: ${metric.duration.toFixed(3)}ms`);
        });
      }
      
      ctx.body = { success: true };
    } catch (error) {
      console.error('Error handling performance submission:', error);
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }
  
  // Clear performance data
  _clearPerformanceData() {
    this._performanceData = {
      metrics: [],
      session: {
        sessionId: '',
        startTime: 0,
        environment: {
          branch: '',
          commitHash: '',
          platform: '',
          appVersion: '',
        },
      },
    };
    console.log('🧹 Performance data cleared');
  }
  
  // Get current performance data
  getPerformanceData() {
    return { ...this._performanceData };
  }
}

export default FixtureServer;
