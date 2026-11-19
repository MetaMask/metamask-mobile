// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
// eslint-disable-next-line import-x/no-extraneous-dependencies
import axios from 'axios';
import {
  checkBlockedRequests,
  installNetConnectGuard,
} from '../../../app/util/test/netConnectGuard';

// Installs the same root-level hooks testSetupView.js installs for view
// tests, so these fences run against the production wiring.
installNetConnectGuard();

const currentTestName = () => expect.getState().currentTestName ?? '';

describe('netConnectGuard', () => {
  it('fails a test whose app code swallows an unmocked request', async () => {
    const appCodeThatSwallowsErrors = async () => {
      try {
        await fetch('https://unmocked-guard.example.com/v1/things');
      } catch {
        return null;
      }
    };

    await appCodeThatSwallowsErrors();

    const error = await checkBlockedRequests(currentTestName()).catch(
      (caught) => caught,
    );
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain(currentTestName());
    expect(error.message).toContain(
      'GET https://unmocked-guard.example.com/v1/things',
    );
    expect(error.message).toContain('tests/component-view/api-mocking/');

    // The check clears the registry, so the root-level afterEach the guard
    // installed sees no leftover requests.
    await expect(
      checkBlockedRequests(currentTestName()),
    ).resolves.toBeUndefined();
  });

  it('does not fail a test whose requests are mocked', async () => {
    nock('https://mocked-guard.example.com')
      .get('/v1/things')
      .reply(200, { ok: true })
      .persist();

    const response = await fetch('https://mocked-guard.example.com/v1/things');

    expect(response.status).toBe(200);
    // Also proves the previous test's records did not leak into this one.
    await expect(
      checkBlockedRequests(currentTestName()),
    ).resolves.toBeUndefined();
  });

  it('records a request fired without awaiting it', async () => {
    fetch('https://unmocked-forgot-await.example.com/v1/fire-and-forget').catch(
      () => undefined,
    );

    await expect(checkBlockedRequests(currentTestName())).rejects.toThrow(
      'GET https://unmocked-forgot-await.example.com/v1/fire-and-forget',
    );
  });

  it('records an unmocked path on a mocked host', async () => {
    nock('https://mocked-host-guard.example.com')
      .get('/v1/known')
      .reply(200, { ok: true })
      .persist();

    const appCodeThatSwallowsErrors = async () => {
      try {
        await fetch('https://mocked-host-guard.example.com/v1/unknown');
      } catch {
        return null;
      }
    };
    await appCodeThatSwallowsErrors();

    await expect(checkBlockedRequests(currentTestName())).rejects.toThrow(
      'GET https://mocked-host-guard.example.com/v1/unknown',
    );
  });

  it('records an axios request the app code catches', async () => {
    const appCodeThatSwallowsErrors = async () => {
      try {
        await axios.get('https://unmocked-axios-guard.example.com/v2/other');
      } catch {
        return null;
      }
    };
    await appCodeThatSwallowsErrors();

    await expect(checkBlockedRequests(currentTestName())).rejects.toThrow(
      'GET https://unmocked-axios-guard.example.com/v2/other',
    );
  });
});
