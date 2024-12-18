import { isProduction } from './environment';

const originalNodeEnvironment = process.env.NODE_ENV;

describe('isProduction', () => {
  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnvironment;
  });

  it('returns true when NODE_ENV is "production"', () => {
    process.env.NODE_ENV = 'production';
    expect(isProduction()).toBe(true);
  });

  it('returns false when NODE_ENV is "development"', () => {
    process.env.NODE_ENV = 'development';
    expect(isProduction()).toBe(false);
  });

  it('returns false when NODE_ENV is "test"', () => {
    process.env.NODE_ENV = 'test';
    expect(isProduction()).toBe(false);
  });
});
