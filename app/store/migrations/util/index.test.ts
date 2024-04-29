import { ensureValidState } from './';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

describe('ensureValidState', () => {
  it('should return false for non-object states', () => {
    const state = 'not an object';
    const result = ensureValidState(state, 1);
    expect(result).toBe(false);
  });

  it('should return false if state.engine is not an object', () => {
    const state = { engine: 'not an object' };
    const result = ensureValidState(state, 1);
    expect(result).toBe(false);
  });

  it('should return false if state.engine.backgroundState is not an object', () => {
    const state = { engine: { backgroundState: 'not an object' } };
    const result = ensureValidState(state, 1);
    expect(result).toBe(false);
  });

  it('should return true for valid state objects', () => {
    const state = { engine: { backgroundState: {} } };
    const result = ensureValidState(state, 1);
    expect(result).toBe(true);
  });
});
