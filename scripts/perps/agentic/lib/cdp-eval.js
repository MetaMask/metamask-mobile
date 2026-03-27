'use strict';

/**
 * Evaluate a JS expression in the app's Hermes runtime via CDP Runtime.evaluate.
 * Returns the evaluated value (primitives and JSON-serialisable objects).
 */
async function cdpEval(client, expression) {
  // Hermes doesn't support async in Runtime.evaluate, use a plain IIFE
  const wrapped = `(function() { return (${expression}); })()`;
  const result = await client.send('Runtime.evaluate', {
    expression: wrapped,
    returnByValue: true,
    awaitPromise: false,
    generatePreview: false,
  });

  if (result.exceptionDetails) {
    const desc =
      result.exceptionDetails.exception?.description ||
      result.exceptionDetails.text ||
      JSON.stringify(result.exceptionDetails);
    throw new Error(`Evaluation error: ${desc}`);
  }

  return result.result?.value;
}

/**
 * Evaluate a JS expression that returns a Promise.
 * Hermes CDP doesn't support awaitPromise, so we store the result on
 * globalThis.__cdp_async__ and poll for it.
 */
async function cdpEvalAsync(client, expression, timeoutMs = 30000) {
  // Unique key per call to avoid collisions
  const key = `__cdp_async_${Date.now()}_${Math.random().toString(36).slice(2)}__`;

  // Kick off the promise, store result when done.
  // The try/catch guards against synchronous throws during argument evaluation
  // of Promise.resolve(<expression>) — without it, a sync error escapes the
  // IIFE and globalThis[key] stays 'pending' forever.
  const kickoff = `(function() {
    globalThis['${key}'] = { status: 'pending' };
    try {
      Promise.resolve(${expression})
        .then(function(v) { globalThis['${key}'] = { status: 'resolved', value: v }; })
        .catch(function(e) { globalThis['${key}'] = { status: 'rejected', error: String(e) }; });
    } catch(e) {
      globalThis['${key}'] = { status: 'rejected', error: String(e) };
    }
    return 'started';
  })()`;

  const kickoffResult = await client.send('Runtime.evaluate', {
    expression: kickoff,
    returnByValue: true,
    awaitPromise: false,
  }, timeoutMs);

  // If the IIFE itself failed to evaluate (syntax error, etc.), bail early
  if (kickoffResult.exceptionDetails) {
    const desc =
      kickoffResult.exceptionDetails.exception?.description ||
      kickoffResult.exceptionDetails.text ||
      JSON.stringify(kickoffResult.exceptionDetails);
    throw new Error(`Async evaluation error: ${desc}`);
  }

  // Best-effort cleanup — swallow errors so a disconnected WebSocket
  // doesn't obscure the actual result or diagnostic error.
  const cleanup = () =>
    client
      .send('Runtime.evaluate', {
        expression: `delete globalThis['${key}']`,
        returnByValue: true,
        awaitPromise: false,
      })
      // eslint-disable-next-line no-empty-function
      .catch(() => {});

  // Poll for completion
  const pollInterval = 200;
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollInterval));
      const check = await client.send('Runtime.evaluate', {
        expression: `(function() { return globalThis['${key}']; })()`,
        returnByValue: true,
        awaitPromise: false,
      }, timeoutMs);
      const val = check.result?.value;
      if (val?.status === 'resolved') {
        return val.value;
      }
      if (val?.status === 'rejected') {
        throw new Error(`Async evaluation error: ${val.error}`);
      }
    }
    throw new Error(`Async evaluation timed out after ${timeoutMs}ms`);
  } finally {
    await cleanup();
  }
}

module.exports = { cdpEval, cdpEvalAsync };
