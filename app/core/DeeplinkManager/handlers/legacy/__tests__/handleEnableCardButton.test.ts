import { handleEnableCardButton } from '../handleEnableCardButton';
import { store } from '../../../../../store';
import { setAlwaysShowCardButton } from '../../../../redux/slices/card';
import { selectCardExperimentalSwitch } from '../../../../../selectors/featureFlagController/card';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';

jest.mock('../../../../../store');
jest.mock('../../../../redux/slices/card');
jest.mock('../../../../../selectors/featureFlagController/card');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');

describe('handleEnableCardButton', () => {
  const mockGetState = jest.fn();
  const mockDispatch = jest.fn();
  const mockDevLogger = DevLogger.log as jest.Mock;
  const mockLogger = Logger.log as jest.Mock;
  const mockLoggerError = Logger.error as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    (store.getState as jest.Mock) = mockGetState;
    (store.dispatch as jest.Mock) = mockDispatch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('when card experimental switch is enabled', () => {
    beforeEach(() => {
      (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
        true,
      );
      mockGetState.mockReturnValue({});
    });

    it('dispatches setAlwaysShowCardButton with true', () => {
      handleEnableCardButton();

      expect(mockDispatch).toHaveBeenCalledWith(setAlwaysShowCardButton(true));
    });

    it('logs successful enablement', () => {
      handleEnableCardButton();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleEnableCardButton] Successfully enabled card button',
      );
      expect(mockLogger).toHaveBeenCalledWith(
        '[handleEnableCardButton] Card button enabled via deeplink',
      );
    });

    it('logs starting message', () => {
      handleEnableCardButton();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleEnableCardButton] Starting card button enable deeplink handling',
      );
    });
  });

  describe('when card experimental switch is disabled', () => {
    beforeEach(() => {
      (selectCardExperimentalSwitch as unknown as jest.Mock).mockReturnValue(
        false,
      );
      mockGetState.mockReturnValue({});
    });

    it('does not dispatch setAlwaysShowCardButton', () => {
      handleEnableCardButton();

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('logs that feature flag is disabled', () => {
      handleEnableCardButton();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleEnableCardButton] Card experimental switch is disabled, skipping',
      );
      expect(mockLogger).toHaveBeenCalledWith(
        '[handleEnableCardButton] Card experimental switch feature flag is disabled',
      );
    });

    it('logs starting message', () => {
      handleEnableCardButton();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleEnableCardButton] Starting card button enable deeplink handling',
      );
    });
  });

  describe('when an error occurs', () => {
    const mockError = new Error('Test error');

    beforeEach(() => {
      mockGetState.mockImplementation(() => {
        throw mockError;
      });
    });

    it('logs error with DevLogger', () => {
      handleEnableCardButton();

      expect(mockDevLogger).toHaveBeenCalledWith(
        '[handleEnableCardButton] Failed to enable card button:',
        mockError,
      );
    });

    it('logs error with Logger', () => {
      handleEnableCardButton();

      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        '[handleEnableCardButton] Error enabling card button',
      );
    });

    it('does not dispatch setAlwaysShowCardButton', () => {
      handleEnableCardButton();

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
