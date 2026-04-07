#!/usr/bin/env node
/**
 * pre-conditions.js — Registry of named, executable pre-condition checks.
 *
 * Each entry defines a CDP eval expression (sync or async) and an assertion
 * that must pass before a flow is allowed to run. If a check fails the runner
 * aborts immediately with a clear message and actionable hint instead of
 * letting the flow limp forward and die on step 4 with a cryptic error.
 *
 * Usage in flow JSON:
 *   "pre_conditions": [
 *     "wallet.unlocked",
 *     "perps.ready_to_trade",
 *     { "name": "perps.open_position", "symbol": "BTC" }
 *   ]
 *
 * String entries are looked up by name with no params.
 * Object entries pass remaining fields as params to the expression builder.
 *
 * Keys use dot-notation namespaces (wallet.*, perps.*, ui.*) to signal
 * ownership and avoid collisions across teams.
 *
 * Adding a new check:
 *   1. Add an entry to REGISTRY below.
 *   2. If the expression needs params (e.g. symbol), make `expression` a
 *      function(params) => string instead of a plain string.
 *   3. Set `async: true` if the expression returns a Promise.
 *   4. Update your flow's pre_conditions array.
 *   5. Run `node validate-flow-schema.js` — it validates names against this file.
 */

'use strict';

/**
 * @typedef {Object} PreCondition
 * @property {string}   description  Human-readable description shown on failure.
 * @property {boolean}  async        true if expression returns a Promise.
 * @property {string | ((params: object) => string)} expression
 *   CDP JS expression (ES5 only). String for fixed checks, function for
 *   parameterised checks (receives the spec object minus "name").
 * @property {{ operator: string, field?: string, value?: unknown }} assert
 *   Same operators as recipe step assertions.
 * @property {string}   hint         What to do when the check fails.
 */

/** @type {Record<string, PreCondition>} */
const REGISTRY = {
  'wallet.unlocked': {
    description: 'Wallet is unlocked and app is navigable',
    async: false,
    expression: '(function(){ var r=globalThis.__AGENTIC__.getRoute().name; return JSON.stringify({route:r,unlocked:r!=="Login"&&r!=="LoginView"&&r!=="Onboarding"}); })()',
    assert: { operator: 'eq', field: 'unlocked', value: true },
    hint: 'Unlock the wallet first:\n  bash scripts/perps/agentic/app-state.sh unlock <password>',
  },

  'perps.feature_enabled': {
    description: 'PerpsController is available on Engine.context',
    async: false,
    expression: 'JSON.stringify({enabled: !!(Engine.context && Engine.context.PerpsController)})',
    assert: { operator: 'eq', field: 'enabled', value: true },
    hint: 'Enable the Perps feature flag for this account/environment.',
  },

  'perps.ready_to_trade': {
    description: 'Perps provider is ready to trade',
    async: true,
    expression: '(function(){ var c=Engine.context.PerpsController; var id=c.state.activeProvider; var p=c.providers.get(id); if(!p) return Promise.resolve(JSON.stringify({isAuthenticated:false,error:"no active provider"})); return p.isReadyToTrade().then(function(r){ return JSON.stringify({isAuthenticated:r.ready}); }); })()',
    assert: { operator: 'eq', field: 'isAuthenticated', value: true },
    hint: 'Complete Perps authentication/onboarding before running this flow.',
  },

  'perps.sufficient_balance': {
    description: 'Perps account has a non-zero available balance',
    async: true,
    expression: 'Engine.context.PerpsController.getAccountState().then(function(r){ return JSON.stringify({balance: parseFloat(r.availableBalance||"0")}); })',
    assert: { operator: 'gt', field: 'balance', value: 0 },
    hint: 'Deposit funds into your Perps account before placing orders.',
  },

  'perps.open_position': {
    description: 'At least one open position exists (optionally filtered by symbol)',
    async: true,
    expression: (params) => {
      const filter = params && params.symbol
        ? `function(x){ return x.symbol === '${params.symbol}'; }`
        : `function(){ return true; }`;
      return `Engine.context.PerpsController.getPositions().then(function(ps){ var filtered=ps.filter(${filter}); return JSON.stringify({count:filtered.length}); })`;
    },
    assert: { operator: 'gt', field: 'count', value: 0 },
    hint: 'Open a position first using the trade-open-market flow.',
  },

  'perps.open_position_tpsl': {
    description: 'At least one open position with TP or SL set (optionally filtered by symbol)',
    async: true,
    expression: (params) => {
      const symbolClause = params && params.symbol
        ? `x.symbol === '${params.symbol}' && `
        : '';
      return `Engine.context.PerpsController.getPositions().then(function(ps){ var filtered=ps.filter(function(x){ return ${symbolClause}!!(x.takeProfitPrice||x.stopLossPrice); }); return JSON.stringify({count:filtered.length}); })`;
    },
    assert: { operator: 'gt', field: 'count', value: 0 },
    hint: 'Create a TP/SL first using the tpsl-create flow.',
  },

  'perps.open_limit_order': {
    description: 'At least one open limit order exists (optionally filtered by symbol)',
    async: true,
    expression: (params) => {
      const filter = params && params.symbol
        ? `function(x){ return x.symbol === '${params.symbol}'; }`
        : `function(){ return true; }`;
      return `Engine.context.PerpsController.getOpenOrders().then(function(orders){ var filtered=orders.filter(${filter}); return JSON.stringify({count:filtered.length}); })`;
    },
    assert: { operator: 'gt', field: 'count', value: 0 },
    hint: 'Place a limit order first using the order-limit-place flow.',
  },

  'perps.not_in_watchlist': {
    description: 'Symbol is not already in the watchlist',
    async: false,
    expression: (params) => {
      const symbol = (params && params.symbol) || '';
      return `(function(){ var s=Engine.context.PerpsController.state; var markets=s.isTestnet?s.watchlistMarkets.testnet:s.watchlistMarkets.mainnet; var inList=(markets||[]).some(function(m){ return (m.symbol||m)==='${symbol}'; }); return JSON.stringify({inWatchlist:inList}); })()`;
    },
    assert: { operator: 'eq', field: 'inWatchlist', value: false },
    hint: 'Remove the symbol from the watchlist first, or use a symbol not already in it.',
  },

  'perps.trading_flag': {
    description: 'Perps trading remote feature flag is enabled',
    async: false,
    expression: '(function(){ var f=Engine.context.RemoteFeatureFlagController.state.remoteFeatureFlags.perpsPerpTradingEnabled; var enabled=f===true||(f&&f.enabled===true); return JSON.stringify({enabled:!!enabled}); })()',
    assert: { operator: 'eq', field: 'enabled', value: true },
    hint: 'Enable the perps trading flag: Settings → Experimental → Feature Flags → perpsPerpTradingEnabled.',
  },

  'ui.homepage_redesign_v1_enabled': {
    description: 'Homepage redesign V1 feature flag is ON',
    async: false,
    expression: '(function(){ var f=Engine.context.RemoteFeatureFlagController.state.remoteFeatureFlags.homepageRedesignV1; var enabled=f===true||(f&&f.enabled===true); return JSON.stringify({enabled:!!enabled}); })()',
    assert: { operator: 'eq', field: 'enabled', value: true },
    hint: 'Enable homepageRedesignV1: Settings → Experimental → Feature Flags → homepageRedesignV1.',
  },

  'ui.homepage_redesign_v1_disabled': {
    description: 'Homepage redesign V1 feature flag is OFF (classic PerpsTabView layout)',
    async: false,
    expression: '(function(){ var f=Engine.context.RemoteFeatureFlagController.state.remoteFeatureFlags.homepageRedesignV1; var enabled=f===true||(f&&f.enabled===true); return JSON.stringify({enabled:!!enabled}); })()',
    assert: { operator: 'eq', field: 'enabled', value: false },
    hint: 'Disable homepageRedesignV1: Settings → Experimental → Feature Flags → homepageRedesignV1.',
  },
};

module.exports = REGISTRY;
