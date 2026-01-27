#!/usr/bin/env node
/* eslint-disable import/no-commonjs, import/no-nodejs-modules */
/**
 * Simple Fixture Server for Maestro Tests
 *
 * This is a lightweight fixture server that serves pre-built fixture JSON files
 * without needing to import FixtureBuilder (which has ESM dependencies).
 *
 * Usage:
 *   node e2e/maestro/scripts/simple-fixture-server.js [fixture-name]
 *
 * Available fixtures: default, import-srp
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 12345;
const FIXTURES_DIR = path.join(__dirname, '../fixtures');

// Ensure fixtures directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// Get fixture name from args
const fixtureName = process.argv[2] || 'default';
const fixtureFile = path.join(FIXTURES_DIR, `${fixtureName}.json`);

let fixtureState = null;

// Check if fixture file exists
if (fs.existsSync(fixtureFile)) {
  console.log(`📦 Loading fixture from: ${fixtureFile}`);
  fixtureState = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
} else {
  console.log(`⚠️  Fixture file not found: ${fixtureFile}`);
  console.log(`   Available fixtures:`);

  // List available fixtures
  const files = fs.readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log(`   (none - you need to export fixtures first)`);
    console.log(`\n   To export a fixture, run a Detox test and capture the state.`);
  } else {
    files.forEach(f => console.log(`   - ${f.replace('.json', '')}`));
  }

  // Create a minimal default fixture that triggers onboarding
  console.log(`\n   Using minimal default fixture (will show onboarding)...`);
  fixtureState = {
    engine: {
      backgroundState: {}
    }
  };
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/state.json' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(fixtureState));
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Fixture server started!`);
  console.log(`   URL: http://localhost:${PORT}/state.json`);
  console.log(`   Fixture: ${fixtureName}`);
  console.log(`\n   Press Ctrl+C to stop.\n`);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping fixture server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
