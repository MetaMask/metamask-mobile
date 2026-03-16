/**
 * Standalone Mock Server for Seedless Onboarding Performance Tests
 *
 * Reuses OAuthMockttpService from smoke E2E tests but runs independently
 * of Detox/withFixtures. Started before Appwright tests on BrowserStack.
 *
 * Usage:
 * npx ts-node tests/performance/standalone-mock-server.ts [--port 8000] [--provider google|apple] [--scenario new|existing]
 */

import { getLocal, Mockttp } from 'mockttp';
import {
  createOAuthMockttpService,
  OAuthMockttpService,
} from '../api-mocking/seedless-onboarding';

const DEFAULT_PORT = 8000;

function parseArgs(): {
  port: number;
  provider: 'google' | 'apple';
  scenario: 'new' | 'existing';
} {
  const args = process.argv.slice(2);
  let port = DEFAULT_PORT;
  let provider: 'google' | 'apple' = 'google';
  let scenario: 'new' | 'existing' = 'new';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--provider' && args[i + 1]) {
      provider = args[i + 1] as 'google' | 'apple';
      i++;
    } else if (args[i] === '--scenario' && args[i + 1]) {
      scenario = args[i + 1] as 'new' | 'existing';
      i++;
    }
  }

  return { port, provider, scenario };
}

function configureService(
  service: OAuthMockttpService,
  provider: 'google' | 'apple',
  scenario: 'new' | 'existing',
): void {
  if (provider === 'google' && scenario === 'new') {
    service.configureGoogleNewUser();
  } else if (provider === 'google' && scenario === 'existing') {
    service.configureGoogleExistingUser();
  } else if (provider === 'apple' && scenario === 'new') {
    service.configureAppleNewUser();
  } else if (provider === 'apple' && scenario === 'existing') {
    service.configureAppleExistingUser();
  }
}

async function setupProxyPassthrough(server: Mockttp): Promise<void> {
  await server
    .forAnyRequest()
    .matching((request) => request.path.startsWith('/proxy'))
    .thenCallback(async (request) => {
      const urlParam = new URL(
        request.url,
        'http://localhost',
      ).searchParams.get('url');
      if (!urlParam) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing url parameter' }),
        };
      }

      try {
        const method = request.method;
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(request.headers)) {
          if (
            key.toLowerCase() !== 'host' &&
            key.toLowerCase() !== 'connection' &&
            typeof value === 'string'
          ) {
            headers[key] = value;
          }
        }

        const fetchOptions: RequestInit = { method, headers };
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
          fetchOptions.body = await request.body.getText();
        }

        const response = await fetch(urlParam, fetchOptions);
        const body = await response.text();

        return {
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body,
        };
      } catch (error) {
        console.error(
          `[MockServer] Proxy error for ${urlParam}:`,
          (error as Error).message,
        );
        return {
          statusCode: 502,
          body: JSON.stringify({
            error: 'Proxy fetch failed',
            url: urlParam,
          }),
        };
      }
    });
}

async function main(): Promise<void> {
  const { port, provider, scenario } = parseArgs();

  console.log(`[MockServer] Starting standalone mock server...`);
  console.log(`[MockServer] Port: ${port}`);
  console.log(`[MockServer] Provider: ${provider}, Scenario: ${scenario}`);

  const server = getLocal();
  await server.start(port);

  await server.forGet('/health-check').thenReply(200, 'Mock server is running');

  const oAuthService = createOAuthMockttpService();
  configureService(oAuthService, provider, scenario);
  await oAuthService.setup(server);

  await setupProxyPassthrough(server);

  console.log(`[MockServer] ✅ Running at http://localhost:${port}`);
  console.log(
    `[MockServer] Health check: http://localhost:${port}/health-check`,
  );
  console.log(`[MockServer] Press Ctrl+C to stop`);

  process.on('SIGINT', async () => {
    console.log('\n[MockServer] Shutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[MockServer] Shutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('[MockServer] Fatal error:', error);
  process.exit(1);
});
