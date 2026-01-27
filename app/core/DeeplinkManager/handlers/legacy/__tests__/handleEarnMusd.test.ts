import { handleEarnMusd } from '../handleEarnMusd';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';

jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');

describe('handleEarnMusd', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    (DevLogger.log as jest.Mock) = jest.fn();
  });

  it('navigates to EARN.ROOT with MUSD.CONVERSION_EDUCATION screen and isDeeplink flag', () => {
    handleEarnMusd();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
      screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
      params: { isDeeplink: true },
    });
  });

  it('logs start of deeplink handling', () => {
    handleEarnMusd();

    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleEarnMusd] Starting deeplink handling',
    );
  });

  it('falls back to WALLET.HOME on navigation error', () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('Navigation error');
    });

    handleEarnMusd();

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenLastCalledWith(Routes.WALLET.HOME);
  });

  it('logs error when navigation fails', () => {
    const error = new Error('Navigation error');
    mockNavigate.mockImplementationOnce(() => {
      throw error;
    });

    handleEarnMusd();

    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleEarnMusd] Failed to handle deeplink:',
      error,
    );
  });
});
