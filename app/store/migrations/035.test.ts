import migrate, { PrimaryCurrency } from './035';
import { captureException } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #35', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should change the default primary currency state to Fiat', async () => {
    const oldState = {
      settings: {
        primaryCurrency: 'Fiat',
      },
    };

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual({
      settings: {
        primaryCurrency: PrimaryCurrency.ETH,
      },
    });
  });

  it('should throw error if primaryCurrency property is not defined', async () => {
    const oldState = {
      settings: {},
    };

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      `Migration 35: state.settings.primaryCurrency does not exist: '{}'`,
    );
  });

  it('should throw error if settings property is not defined', async () => {
    const oldState = {
      settings: undefined,
    };

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      `Migration 35: Invalid settings state: '${typeof oldState.settings}'`,
    );
  });

  it('should throw error if state is not defined', async () => {
    const oldState = undefined;

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      `Migration 35: Invalid state: '${typeof oldState}'`,
    );
  });
});
