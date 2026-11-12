import http from 'node:http';

/**
 * Dev-only proxy for QA: forwards Profile API traffic to the dev API and
 * serves the canned error for one QA test ID, so every copy can be exercised.
 *
 *   node scripts/profile-error-proxy.mjs SAVE-08
 *   node scripts/profile-error-proxy.mjs SAVE-02 AUTH_TOKEN_INVALID
 *   node scripts/profile-error-proxy.mjs --list
 *   node scripts/profile-error-proxy.mjs SAVE-08 --port 4011
 */

const UPSTREAM = 'https://profile.dev-api.cx.metamask.io';
const DEFAULT_PORT = 4010;
const DEFAULT_MESSAGE = 'mocked profile API failure';

const ROUTES = {
  update: 'PATCH /v1/profiles/',
  create: 'POST /v1/profiles',
  connect: 'POST /v1/profiles/x/connect',
  disconnect: 'DELETE /v1/profiles/x/account',
};

const AVAILABILITY_PATH = '/v1/profiles/username/availability';

/**
 * One entry per case in docs/social/profile-api-error-codes-testing.md.
 * `codes` is ordered: the first one runs by default, the others are variants.
 */
const CASES = {
  'SAVE-01': { route: 'update', status: 401, codes: ['AUTH_TOKEN_EXPIRED'], title: 'session expired on save' },
  'SAVE-02': {
    route: 'update',
    status: 401,
    codes: ['AUTH_TOKEN_MISSING', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_SUBJECT_MISSING'],
    title: 'the other session-expired codes',
  },
  'SAVE-03': {
    route: 'update',
    status: 403,
    codes: ['AUTH_EARLY_ACCESS_REQUIRED', 'AUTH_PROFILE_ACCESS_DENIED'],
    title: 'access denied on save',
  },
  'SAVE-04': { route: 'update', status: 429, codes: ['RATE_LIMIT_EXCEEDED'], title: 'rate limited on save' },
  'SAVE-05': { route: 'update', status: 404, codes: ['PROFILE_NOT_FOUND'], title: 'profile not found' },
  'SAVE-06': { route: 'update', status: 409, codes: ['PROFILE_ALREADY_EXISTS'], title: 'profile already exists' },
  'SAVE-07': { route: 'update', status: 409, codes: ['PROFILE_USERNAME_IMMUTABLE'], title: 'handle cannot change' },
  'SAVE-08': { route: 'update', status: 409, codes: ['PROFILE_UPDATE_CONFLICT'], title: 'profile changed while saving' },
  'SAVE-09': { route: 'update', status: 409, codes: ['PROFILE_CONFLICT', 'CONFLICT'], title: 'other conflict codes' },
  'SAVE-10': { route: 'update', status: 400, codes: ['PROFILE_DISPLAY_NAME_PROHIBITED'], title: 'display name refused' },
  'SAVE-11': { route: 'update', status: 400, codes: ['PROFILE_DISPLAY_NAME_NOT_ALLOWED'], title: 'display name not allowed' },
  'SAVE-12': { route: 'update', status: 400, codes: ['PROFILE_BIO_PROHIBITED'], title: 'bio refused' },
  'SAVE-13': {
    route: 'update',
    status: 400,
    codes: ['USERNAME_REQUIRED', 'USERNAME_INVALID_CHARACTERS', 'USERNAME_INVALID_FORMAT'],
    title: 'handle rule failures',
  },
  'SAVE-14': { route: 'update', status: 409, codes: ['USERNAME_UNAVAILABLE', 'USERNAME_TAKEN'], title: 'handle unavailable' },
  'SAVE-15': { route: 'update', status: 409, codes: ['USERNAME_RESERVED'], title: 'handle reserved' },
  'SAVE-16': { route: 'update', status: 503, codes: ['USERNAME_VALIDATION_UNAVAILABLE'], title: 'handle check unavailable' },
  'SAVE-17': { route: 'update', status: 400, codes: ['VALIDATION_FAILED'], title: 'generic validation failure on a field' },
  'SAVE-18': { route: 'update', status: 409, codes: ['VALIDATION_FAILED'], title: 'validation failure with another status' },
  'SAVE-19': { route: 'update', status: 500, codes: ['INTERNAL_ERROR'], title: 'server error on save' },
  'SAVE-20': { manual: 'Stop the proxy (Ctrl-C) and retry the save — this case is a dropped connection.', title: 'dropped connection on save' },
  'SAVE-21': { route: 'update', status: 400, codes: ['PROFILE_BIO_PROHIBITED'], title: 'bio code on the handle editor' },
  'SAVE-22': { route: 'update', status: 409, codes: ['PROFILE_UPDATE_CONFLICT'], title: 'conflict while saving the avatar' },
  'SAVE-23': { route: 'update', status: 500, codes: ['INTERNAL_ERROR'], title: 'server error while saving the avatar' },
  'SAVE-24': { route: 'update', status: 429, codes: ['RATE_LIMIT_EXCEEDED'], title: 'rate limited on the trading toggle' },
  'SAVE-25': { manual: 'Stop the proxy (Ctrl-C) and retry the trading toggle.', title: 'dropped connection on the trading toggle' },

  'LINK-01': {
    route: 'update',
    status: 403,
    codes: ['PROFILE_LINKED_ADDRESSES_COOLDOWN'],
    message: 'Linked addresses can only be updated once every 7 days',
    title: 'cooldown with a day count',
  },
  'LINK-02': {
    route: 'update',
    status: 403,
    codes: ['PROFILE_LINKED_ADDRESSES_COOLDOWN'],
    message: 'Too soon',
    retryAfter: 604800,
    title: 'cooldown from the retry detail',
  },
  'LINK-03': {
    route: 'update',
    status: 403,
    codes: ['PROFILE_LINKED_ADDRESSES_COOLDOWN'],
    message: 'Too soon',
    title: 'cooldown with no day count',
  },
  'LINK-04': { route: 'update', status: 403, codes: ['AUTH_PROFILE_ACCESS_DENIED'], title: '403 that is not the cooldown' },
  'LINK-05': { route: 'update', status: 401, codes: ['AUTH_TOKEN_EXPIRED'], title: 'session expired on linked account' },
  'LINK-06': { route: 'update', status: 429, codes: ['RATE_LIMIT_EXCEEDED'], title: 'rate limited on linked account' },
  'LINK-07': { route: 'update', status: 403, codes: ['AUTH_VERIFICATION_UNAVAILABLE'], title: '403 with no copy' },

  'ONB-01': { route: 'create', status: 409, codes: ['PROFILE_ALREADY_EXISTS'], title: 'profile already exists on create' },
  'ONB-02': { route: 'create', status: 429, codes: ['RATE_LIMIT_EXCEEDED'], title: 'rate limited on create' },
  'ONB-03': { route: 'create', status: 401, codes: ['AUTH_TOKEN_EXPIRED'], title: 'session expired on create' },
  'ONB-04': { route: 'create', status: 500, codes: ['INTERNAL_ERROR'], title: 'server error on create' },
  'ONB-05': { availability: ['RESERVED'], title: 'reserved handle (short code)' },
  'ONB-06': { availability: ['USERNAME_RESERVED'], title: 'reserved handle (long code)' },
  'ONB-07': { availability: ['INVALID_FORMAT', 'USERNAME_INVALID_FORMAT'], title: 'invalid handle format' },
  'ONB-08': { availability: ['TAKEN', 'UNAVAILABLE'], title: 'taken handle' },
  'ONB-09': { manual: 'Stop the proxy (Ctrl-C) and retry the handle check.', title: 'handle check failure' },

  'XC-01': {
    route: 'connect',
    status: 401,
    codes: ['AUTH_TOKEN_EXPIRED', 'AUTH_TOKEN_MISSING', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_SUBJECT_MISSING'],
    title: 'session expired on X connect',
  },
  'XC-02': {
    route: 'connect',
    status: 403,
    codes: ['AUTH_EARLY_ACCESS_REQUIRED', 'AUTH_PROFILE_ACCESS_DENIED'],
    title: 'access denied on X connect',
  },
  'XC-03': { route: 'connect', status: 429, codes: ['RATE_LIMIT_EXCEEDED'], title: 'rate limited on X connect' },
  'XC-04': { route: 'connect', status: 409, codes: ['X_ACCOUNT_ALREADY_LINKED'], title: 'X account already linked' },
  'XC-05': { route: 'connect', status: 409, codes: ['X_PROFILE_ALREADY_LINKED'], title: 'profile already linked' },
  'XC-06': { route: 'connect', status: 409, codes: ['X_ACCOUNT_LINK_CONFLICT', 'CONFLICT'], title: 'X link conflict' },
  'XC-07': { route: 'connect', status: 403, codes: ['X_OAUTH_ACCESS_DENIED'], title: 'X access denied' },
  'XC-08': { route: 'connect', status: 400, codes: ['X_OAUTH_STATE_INVALID'], title: 'X state invalid' },
  'XC-09': { route: 'connect', status: 500, codes: ['INTERNAL_ERROR'], title: 'server error on X connect' },
  'XC-10': { manual: 'No mock needed: cancel or close the browser at the X login step.', title: 'user cancels X connect' },
  'XC-11': { route: 'connect', status: 409, codes: ['X_ACCOUNT_ALREADY_LINKED'], title: 'X account already linked from onboarding' },

  'XD-01': {
    route: 'disconnect',
    status: 401,
    codes: ['AUTH_TOKEN_EXPIRED', 'AUTH_TOKEN_MISSING', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_SUBJECT_MISSING'],
    title: 'session expired on X disconnect',
  },
  'XD-02': { route: 'disconnect', status: 429, codes: ['RATE_LIMIT_EXCEEDED'], title: 'rate limited on X disconnect' },
  'XD-03': { route: 'disconnect', status: 500, codes: ['INTERNAL_ERROR'], title: 'server error on X disconnect' },
  'XD-04': { route: 'disconnect', status: 404, codes: ['X_ACCOUNT_NOT_LINKED'], title: 'X not linked (treated as success)' },

  'GEN-01': { route: 'update', status: 400, omitCode: true, title: 'legacy 400 without a code' },
  'GEN-02': { route: 'update', status: 400, omitCode: true, title: 'legacy 400 without a code' },
  'GEN-03': {
    route: 'update',
    status: 403,
    omitCode: true,
    message: 'Linked addresses can only be updated once every 30 days',
    title: 'legacy cooldown without a code',
  },
  'GEN-04': {
    route: 'update',
    status: 403,
    omitCode: true,
    message: 'Linked addresses can only be updated once every 30 days',
    title: 'legacy cooldown message on the wrong surface',
  },
  'GEN-05': { manual: 'No mock needed: retry the same action after an error.', title: 'retry after an error' },
  'GEN-06': { manual: 'No mock needed: enable VoiceOver/TalkBack, then trigger any save error.', title: 'screen reader announcement' },
  'GEN-07': { manual: 'No mock needed: switch the app language, then trigger any save error.', title: 'non-English locale' },
};

const usage = (message) => {
  if (message) {
    console.error(`${message}\n`);
  }
  console.log('Usage: node scripts/profile-error-proxy.mjs <TEST-ID> [CODE] [--port 4010]');
  console.log('       node scripts/profile-error-proxy.mjs --list\n');
  console.log(`Cases: ${Object.keys(CASES).length}. Run --list to see them.`);
  process.exit(message ? 1 : 0);
};

const describe = (testId, entry) => {
  const where = entry.manual
    ? 'no mock'
    : entry.availability
      ? `GET ${AVAILABILITY_PATH} → 200`
      : `${ROUTES[entry.route]} → ${entry.status}`;
  return `${testId.padEnd(7)} ${where}`;
};

const list = () => {
  for (const [testId, entry] of Object.entries(CASES)) {
    const codes = entry.codes?.join(', ') ?? entry.availability?.join(', ') ?? '';
    const title = entry.title ? `  ${entry.title}` : '';
    console.log(`${describe(testId, entry)}${codes ? `  ${codes}` : ''}${title}`);
  }
};

const parseArgs = (argv) => {
  const positionals = [];
  let port = DEFAULT_PORT;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--list' || arg === '-l') {
      list();
      process.exit(0);
    }
    if (arg === '--port') {
      port = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith('--port=')) {
      port = Number(arg.slice('--port='.length));
      continue;
    }
    positionals.push(arg);
  }

  return { testId: positionals[0], variant: positionals[1], port };
};

const { testId, variant, port } = parseArgs(process.argv.slice(2));

if (!testId) {
  usage();
}

const entry = CASES[testId];
if (!entry) {
  usage(`Unknown test ID: ${testId}`);
}

if (entry.manual) {
  console.log(entry.manual);
  process.exit(0);
}

if (!Number.isInteger(port) || port <= 0) {
  usage(`Invalid port: ${port}`);
}

const availableCodes = entry.codes ?? entry.availability;
if (variant && !availableCodes?.includes(variant)) {
  usage(`Unknown code "${variant}" for ${testId}. Use one of: ${availableCodes?.join(', ')}`);
}
const code = variant ?? availableCodes?.[0];

const matchesMock = (method, pathname) => {
  if (entry.availability) {
    return method === 'GET' && pathname === AVAILABILITY_PATH;
  }
  const route = ROUTES[entry.route];
  const target = `${method} ${pathname}`;
  return route.endsWith('/') ? target.startsWith(route) : target === route;
};

const message = entry.message ?? DEFAULT_MESSAGE;

const mockBody = () =>
  entry.availability
    ? null // built per request, needs the username
    : {
        ...(entry.omitCode ? {} : { code }),
        message,
        ...(entry.retryAfter
          ? {
              details: [
                {
                  code: 'RETRY_AFTER',
                  message: 'Too soon',
                  meta: { retry_after_seconds: entry.retryAfter },
                },
              ],
            }
          : {}),
      };

const availabilityBody = (username) => ({
  username,
  normalized: username,
  available: false,
  valid: true,
  errors: [{ code, message: 'mocked availability refusal' }],
});

const sendJson = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

const forward = async (req, res, pathname, search, body) => {
  const upstream = await fetch(`${UPSTREAM}${pathname}${search}`, {
    method: req.method,
    headers: Object.fromEntries(
      Object.entries(req.headers).filter(
        ([key]) => key !== 'host' && key !== 'content-length',
      ),
    ),
    body,
  });

  // fetch already decoded the body, so the encoding headers no longer apply.
  const headers = Object.fromEntries(upstream.headers);
  delete headers['content-encoding'];
  delete headers['content-length'];
  delete headers['transfer-encoding'];

  res.writeHead(upstream.status, headers);
  res.end(Buffer.from(await upstream.arrayBuffer()));
};

const server = http.createServer(async (req, res) => {
  // Parse by hand: `new URL('//v1/...')` treats `//v1` as a host. A trailing
  // slash on PROFILE_API_URL produces exactly that, so collapse it instead.
  const [rawPathname = '/', rawQuery = ''] = (req.url ?? '/').split('?');
  const pathname = rawPathname.replace(/\/{2,}/g, '/');
  const search = rawQuery ? `?${rawQuery}` : '';
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  if (matchesMock(req.method, pathname)) {
    if (entry.availability) {
      const username =
        new URLSearchParams(rawQuery).get('username') ?? 'test';
      console.log(`${req.method} ${pathname} -> 200 ${code} (mocked)`);
      return sendJson(res, 200, availabilityBody(username));
    }
    console.log(`${req.method} ${pathname} -> ${entry.status} ${code ?? '(no code)'} (mocked)`);
    return sendJson(res, entry.status, mockBody());
  }

  try {
    await forward(req, res, pathname, search, body);
    console.log(`${req.method} ${pathname} -> forwarded`);
  } catch (error) {
    console.error(`${req.method} ${pathname} -> proxy failure`, error);
    if (!res.headersSent) {
      sendJson(res, 502, {
        code: 'PROXY_FAILURE',
        message: 'Proxy could not reach the dev API',
      });
    }
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${port} is already in use. Stop the other proxy or start this one with --port <port>.`,
    );
    process.exit(1);
  }
  throw error;
});

server.listen(port, () => {
  console.log(`Profile API proxy on http://localhost:${port}`);
  console.log(`  case:   ${describe(testId, entry)}${code ? `  ${code}` : ''}`);
  console.log(`  title:  ${entry.title ?? '(none)'}`);
  if (entry.retryAfter) {
    console.log(`  retry:  ${entry.retryAfter}s`);
  }
  if (availableCodes && availableCodes.length > 1) {
    console.log(`  codes:  ${availableCodes.join(', ')} (pass one as the second argument)`);
  }
});
