import { classifyApiCall } from './classifyApiCall';

describe('classifyApiCall', () => {
  it.each([
    ['GET', 'api.example.com/v1/accounts', 'app'],
    ['POST', 'mainnet.infura.io/v3/***', 'app'],
    ['GET', 'localhost:8081/index.bundle', 'app'],
    ['GET', 'api.example.com/health-check', 'app'],
    ['GET', 'localhost:8000/mock', 'test_infra'],
    ['POST', '10.0.2.2:8000/', 'test_infra'],
    ['GET', '10.0.2.2:12345/health-check', 'test_infra'],
    ['GET', 'o123.ingest.sentry.io/api/1/envelope/', 'telemetry'],
    ['POST', 'clients2.google.com/time/1/current', 'telemetry'],
    ['OPTIONS', 'api.example.com/v1/accounts', 'preflight'],
    ['OPTIONS', 'localhost:8000/mock', 'test_infra'],
    ['OPTIONS', 'o123.ingest.sentry.io/api/1/envelope/', 'telemetry'],
  ])('classifies %s %s as %s', (method, url, kind) => {
    expect(classifyApiCall(method, url)).toBe(kind);
  });
});
