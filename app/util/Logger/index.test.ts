import Logger from '.';
import {
  captureException,
  withScope,
  captureMessage,
} from '@sentry/react-native';
import { AGREED, METRICS_OPT_IN } from '../../constants/storage';
import DefaultPreference from 'react-native-default-preference';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);
const mockedCaptureMessage = jest.mocked(captureMessage);
const mockedWithScope = jest.mocked(withScope);

describe('Logger', () => {
  beforeEach(() => {
    DefaultPreference.get = jest.fn((key: string) => {
      switch (key) {
        case METRICS_OPT_IN:
          return Promise.resolve(AGREED);
        default:
          return Promise.resolve('');
      }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('error', () => {
    it('warns if error is not defined', async () => {
      const warn = jest.spyOn(console, 'warn');
      await Logger.error(undefined as any);
      expect(warn).toBeCalledWith('No error provided');
    });

    it('skips captureException if metrics is opted out', async () => {
      DefaultPreference.get = jest.fn((key: string) => {
        switch (key) {
          case METRICS_OPT_IN:
            return Promise.resolve('');
          default:
            return Promise.resolve('');
        }
      });
      const testError = new Error('testError');
      await Logger.error(testError);
      expect(mockedCaptureException).not.toBeCalled();
    });

    it('calls captureException if metrics is opted in', async () => {
      const testError = new Error('testError');
      await Logger.error(testError);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    });

    it('calls withScope if extra is passed in', async () => {
      const testError = new Error('testError');
      await Logger.error(testError, 'extraMessage');
      expect(mockedWithScope).toHaveBeenCalledTimes(1);
    });

    it('calls captureException when string is passed instead of Error object', async () => {
      const testError = 'testError' as any;
      await Logger.error(testError);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('message', () => {
    it('skips captureMessage if metrics is opted out', async () => {
      DefaultPreference.get = jest.fn((key: string) => {
        switch (key) {
          case METRICS_OPT_IN:
            return Promise.resolve('');
          default:
            return Promise.resolve('');
        }
      });
      await Logger.message('testMessage');
      expect(mockedCaptureMessage).not.toHaveBeenCalled();
    });
    it('calls captureMessage if metrics is opted in', async () => {
      await Logger.message('testMessage');
      expect(mockedCaptureMessage).toHaveBeenCalledTimes(1);
    });
  });
});
