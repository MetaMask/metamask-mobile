import migrate from './035';
import { captureException } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #30', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should change the default primary currency state to Fiat', () => {
    const oldState = {
      settings: {
        primaryCurrency: 'Fiat',
      },
    };

    const newState = migrate(oldState);
    expect(newState).toStrictEqual({
      settings: {
        primaryCurrency: 'ETH',
      },
    });
  });

  it('should throw error if primaryCurrency property is not defined', () => {
    const oldState = {
      settings: {},
    };

    const newState = migrate(oldState);
    expect(newState).toStrictEqual(oldState);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      `Migration 30: Invalid state settings parameter: '${JSON.stringify(
        oldState.settings,
      )}'`,
    );
  });

  it('should throw error if settings property is not defined', () => {
    const oldState = {
      settings: undefined,
    };

    const newState = migrate(oldState);
    expect(newState).toStrictEqual(oldState);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      `Migration 30: Invalid settings state: '${typeof oldState.settings}'`,
    );
  });

  it('should throw error if state is not defined', () => {
    const oldState = undefined;

    const newState = migrate(oldState);
    expect(newState).toStrictEqual(oldState);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      `Migration 30: Invalid state: '${typeof oldState}'`,
    );
  });
});
