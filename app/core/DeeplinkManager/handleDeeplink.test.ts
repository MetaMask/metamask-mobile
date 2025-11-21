import { handleDeeplink } from './handleDeeplink';
import { checkForDeeplink } from '../../actions/user';
import ReduxService from '../redux';
import Logger from '../../util/Logger';
import { AppStateEventProcessor } from '../AppStateEventListener';

jest.mock('../../actions/user', () => ({
  checkForDeeplink: jest.fn(() => ({ type: 'CHECK_FOR_DEEPLINK' })),
}));

jest.mock('../redux', () => ({
  __esModule: true,
  default: {
    store: {
      dispatch: jest.fn(),
    },
  },
}));

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../AppStateEventListener', () => ({
  AppStateEventProcessor: {
    setCurrentDeeplink: jest.fn(),
  },
}));

describe('handleDeeplink', () => {
  const mockDispatch = ReduxService.store.dispatch as jest.Mock;
  const mockCheckForDeeplink = checkForDeeplink as jest.Mock;
  const mockLoggerError = Logger.error as jest.Mock;
  const mockSetCurrentDeeplink =
    AppStateEventProcessor.setCurrentDeeplink as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process valid URI and dispatch checkForDeeplink', () => {
    const testUri = 'metamask://test-deeplink';

    handleDeeplink({ uri: testUri });

    expect(mockSetCurrentDeeplink).toHaveBeenCalledWith(testUri);
    expect(mockCheckForDeeplink).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CHECK_FOR_DEEPLINK' });
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('should handle undefined URI without processing', () => {
    handleDeeplink({ uri: undefined });

    expect(mockSetCurrentDeeplink).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockCheckForDeeplink).not.toHaveBeenCalled();
  });

  it('should handle empty string URI without processing', () => {
    handleDeeplink({ uri: '' });

    expect(mockSetCurrentDeeplink).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockCheckForDeeplink).not.toHaveBeenCalled();
  });

  it('should handle non-string URI without processing', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Testing runtime behavior with invalid type
    handleDeeplink({ uri: 123 });

    expect(mockSetCurrentDeeplink).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockCheckForDeeplink).not.toHaveBeenCalled();
  });

  it('should handle complex URI schemes', () => {
    const complexUri =
      'metamask://dapp/connect?url=https://example.com&chainId=1';

    handleDeeplink({ uri: complexUri });

    expect(mockSetCurrentDeeplink).toHaveBeenCalledWith(complexUri);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CHECK_FOR_DEEPLINK' });
  });

  it('should handle errors gracefully and log them', () => {
    const testUri = 'metamask://test';
    const mockError = new Error('Test error');

    mockSetCurrentDeeplink.mockImplementationOnce(() => {
      throw mockError;
    });

    handleDeeplink({ uri: testUri });

    expect(mockLoggerError).toHaveBeenCalledWith(
      mockError,
      'Deeplink: Error parsing deeplink',
    );
  });

  it('should handle dispatch errors gracefully', () => {
    const testUri = 'metamask://test';
    const mockError = new Error('Dispatch error');

    mockDispatch.mockImplementationOnce(() => {
      throw mockError;
    });

    handleDeeplink({ uri: testUri });

    expect(mockSetCurrentDeeplink).toHaveBeenCalledWith(testUri);
    expect(mockLoggerError).toHaveBeenCalledWith(
      mockError,
      'Deeplink: Error parsing deeplink',
    );
  });

  it('should handle options object without uri parameter', () => {
    handleDeeplink({});

    expect(mockSetCurrentDeeplink).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockCheckForDeeplink).not.toHaveBeenCalled();
  });
});
