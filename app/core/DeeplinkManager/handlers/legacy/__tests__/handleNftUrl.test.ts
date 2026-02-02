import { handleNftUrl } from '../handleNftUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';

jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');

describe('handleNftUrl', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    (DevLogger.log as jest.Mock) = jest.fn();
    (Logger.error as jest.Mock) = jest.fn();
  });

  it('navigates to NFTS_FULL_VIEW', () => {
    handleNftUrl();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.NFTS_FULL_VIEW);
  });

  it('logs start of deeplink handling', () => {
    handleNftUrl();

    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleNftUrl] Starting NFT deeplink handling',
    );
  });

  it('falls back to WALLET.HOME on navigation error', () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('Navigation error');
    });

    handleNftUrl();

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenLastCalledWith(Routes.WALLET.HOME);
  });

  it('logs error when navigation fails', () => {
    const error = new Error('Navigation error');
    mockNavigate.mockImplementationOnce(() => {
      throw error;
    });

    handleNftUrl();

    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleNftUrl] Failed to handle NFT deeplink:',
      error,
    );
    expect(Logger.error).toHaveBeenCalledWith(
      error,
      '[handleNftUrl] Error handling NFT deeplink',
    );
  });

  it('logs error when fallback navigation also fails', () => {
    const primaryError = new Error('Primary navigation error');
    const fallbackError = new Error('Fallback navigation error');
    mockNavigate
      .mockImplementationOnce(() => {
        throw primaryError;
      })
      .mockImplementationOnce(() => {
        throw fallbackError;
      });

    handleNftUrl();

    expect(Logger.error).toHaveBeenCalledWith(
      primaryError,
      '[handleNftUrl] Error handling NFT deeplink',
    );
    expect(Logger.error).toHaveBeenCalledWith(
      fallbackError,
      '[handleNftUrl] Failed to navigate to fallback screen',
    );
  });
});
