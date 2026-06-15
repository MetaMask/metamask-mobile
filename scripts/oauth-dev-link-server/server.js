#!/usr/bin/env node

const http = require('http');

const PORT = Number(process.env.PORT || 3000);
const HOST = 'firm-correct-ram.ngrok-free.app';
const OAUTH_REDIRECT_PATH = '/oauth-redirect';
const PACKAGE_NAME = 'io.metamask';
const DEBUG_SHA256 =
  '6F:9F:44:4A:F1:CB:1F:F7:C0:D7:79:1A:F2:E7:75:FD:DF:4D:48:90:06:42:64:76:40:E2:25:78:35:54:EC:F9';

const assetLinks = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: PACKAGE_NAME,
      sha256_cert_fingerprints: [DEBUG_SHA256],
    },
  },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function send(res, statusCode, contentType, body) {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function renderPage(title, body) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 32px; line-height: 1.45; }
      code, pre { background: #f4f4f4; border-radius: 6px; padding: 2px 5px; }
      pre { padding: 12px; overflow: auto; }
    </style>
  </head>
  <body>${body}</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
  const appLinkUrl = `https://${HOST}${OAUTH_REDIRECT_PATH}?state=test`;

  if (requestUrl.pathname === '/.well-known/assetlinks.json') {
    send(res, 200, 'application/json', JSON.stringify(assetLinks, null, 2));
    return;
  }

  if (requestUrl.pathname === OAUTH_REDIRECT_PATH) {
    send(
      res,
      200,
      'text/html; charset=utf-8',
      renderPage(
        'OAuth Redirect Test',
        `<h1>OAuth Redirect Test</h1>
    <p>If Android App Links are verified, MetaMask should open before you see this page.</p>
    <p>Path: <code>${escapeHtml(requestUrl.pathname)}</code></p>
    <p>Query:</p>
    <pre>${escapeHtml(requestUrl.search || '(none)')}</pre>
    <p><a href="metamask://oauth-redirect${escapeHtml(
      requestUrl.search || '',
    )}">Open MetaMask with custom scheme</a></p>`,
      ),
    );
    return;
  }

  send(
    res,
    200,
    'text/html; charset=utf-8',
    renderPage(
      'MetaMask OAuth App Link Test',
      `<h1>MetaMask OAuth App Link Test</h1>
    <p>Public ngrok host:</p>
    <pre>https://${HOST}</pre>
    <p>Android verification file:</p>
    <pre>https://${HOST}/.well-known/assetlinks.json</pre>
    <p>OAuth callback path:</p>
    <pre>${appLinkUrl}</pre>
    <p><a href="${appLinkUrl}">Open MetaMask App Link</a></p>
    <p>Package:</p>
    <pre>${PACKAGE_NAME}</pre>
    <p>SHA-256:</p>
    <pre>${DEBUG_SHA256}</pre>`,
    ),
  );
});

server.listen(PORT, () => {
  console.log(`OAuth dev link server listening on http://localhost:${PORT}`);
  console.log(`ngrok URL: https://${HOST}`);
  console.log(`assetlinks: https://${HOST}/.well-known/assetlinks.json`);
  console.log(`redirect: https://${HOST}${OAUTH_REDIRECT_PATH}?state=test`);
});
