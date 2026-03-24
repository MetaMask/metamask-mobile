#!/usr/bin/env node
/**
 * validate-pre-conditions.js — Offline assertion correctness test.
 *
 * For every entry in the pre-conditions REGISTRY, verifies that:
 *   - checkAssert(passFixture, entry.assert) returns true
 *   - checkAssert(failFixture, entry.assert) returns false
 *
 * No live app or CDP connection required.
 *
 * Usage:
 *   node scripts/perps/agentic/validate-pre-conditions.js
 */

'use strict';

const REGISTRY = require('./lib/registry');
const { checkAssert } = require('./lib/assert');

// ---------------------------------------------------------------------------
// Fixtures — pass/fail JSON strings per REGISTRY key
// ---------------------------------------------------------------------------
const FIXTURES = {
  'wallet.unlocked': {
    pass: '{"route":"WalletView","unlocked":true}',
    fail: '{"route":"Login","unlocked":false}',
  },
  'perps.feature_enabled': {
    pass: '{"enabled":true}',
    fail: '{"enabled":false}',
  },
  'perps.ready_to_trade': {
    pass: '{"isAuthenticated":true}',
    fail: '{"isAuthenticated":false}',
  },
  'perps.sufficient_balance': {
    pass: '{"balance":100}',
    fail: '{"balance":0}',
  },
  'perps.open_position': {
    pass: '{"count":2}',
    fail: '{"count":0}',
  },
  'perps.open_position_tpsl': {
    pass: '{"count":1}',
    fail: '{"count":0}',
  },
  'perps.open_limit_order': {
    pass: '{"count":1}',
    fail: '{"count":0}',
  },
  'perps.not_in_watchlist': {
    pass: '{"inWatchlist":false}',
    fail: '{"inWatchlist":true}',
  },
  'perps.trading_flag': {
    pass: '{"enabled":true}',
    fail: '{"enabled":false}',
  },
  'ui.homepage_redesign_v1_enabled': {
    pass: '{"enabled":true}',
    fail: '{"enabled":false}',
  },
  'ui.homepage_redesign_v1_disabled': {
    pass: '{"enabled":false}',
    fail: '{"enabled":true}',
  },
};

// ---------------------------------------------------------------------------
// Run checks
// ---------------------------------------------------------------------------
const failures = [];
const keys = Object.keys(REGISTRY);

keys.forEach((name) => {
  const entry = REGISTRY[name];
  const fixture = FIXTURES[name];

  if (!fixture) {
    failures.push('  ' + name + ': no fixture defined — add pass/fail JSON strings to FIXTURES');
    return;
  }

  const passResult = checkAssert(fixture.pass, entry.assert);
  if (!passResult) {
    failures.push('  ' + name + ': pass-fixture did not satisfy assert\n' +
      '    fixture : ' + fixture.pass + '\n' +
      '    assert  : ' + JSON.stringify(entry.assert));
  }

  const failResult = checkAssert(fixture.fail, entry.assert);
  if (failResult) {
    failures.push('  ' + name + ': fail-fixture unexpectedly satisfied assert\n' +
      '    fixture : ' + fixture.fail + '\n' +
      '    assert  : ' + JSON.stringify(entry.assert));
  }
});

if (failures.length > 0) {
  console.error('Pre-condition assertion check FAILED:\n' + failures.join('\n'));
  process.exit(1);
} else {
  console.log('All ' + keys.length + ' pre-condition(s) pass assertion correctness check.');
}
