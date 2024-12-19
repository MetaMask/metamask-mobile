import hideLoadingState from './hideLoadingState'; // Adjust the import path as necessary
import Routes from '../../../constants/navigation/Routes';
import SDKConnect from '../SDKConnect';
import NavigationService from '../../NavigationService';

jest.mock('../../NavigationService', () => ({
  navigation: {
    canGoBack: jest.fn(),
    goBack: jest.fn(),
    getCurrentRoute: jest.fn().mockReturnValue({
      name: 'dummy',
    }),
  },
}));
jest.mock('../SDKConnect');

describe('hideLoadingState', () => {
  let mockInstance = {} as unknown as SDKConnect;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstance = {
      state: {
        sdkLoadingState: {},
      },
    } as unknown as SDKConnect;
  });

  it('should clear the SDK loading state', async () => {
    mockInstance.state.sdkLoadingState = {
      channelId: true,
    };
    await hideLoadingState({
      instance: mockInstance,
    });

    expect(mockInstance.state.sdkLoadingState).toEqual({});
  });

  describe('Navigation handling', () => {
    it('should check the current route name', async () => {
      await hideLoadingState({
        instance: mockInstance,
      });

      expect(NavigationService.navigation.getCurrentRoute).toHaveBeenCalled();
    });

    it('should go back if the current route is SDK_LOADING and can go back', async () => {
      (
        NavigationService.navigation?.getCurrentRoute as jest.Mock
      ).mockReturnValue({
        name: Routes.SHEET.SDK_LOADING,
      });
      (NavigationService.navigation?.canGoBack as jest.Mock).mockReturnValue(
        true,
      );

      await hideLoadingState({
        instance: mockInstance,
      });

      expect(NavigationService.navigation.goBack).toHaveBeenCalled();
    });

    it('should not go back if the current route is not SDK_LOADING', async () => {
      (
        NavigationService.navigation?.getCurrentRoute as jest.Mock
      ).mockReturnValue({
        name: 'mockRouteName',
      });

      await hideLoadingState({
        instance: mockInstance,
      });

      expect(NavigationService.navigation.goBack).not.toHaveBeenCalled();
    });

    it('should not go back if cannot go back', async () => {
      (
        NavigationService.navigation?.getCurrentRoute as jest.Mock
      ).mockReturnValue({
        name: Routes.SHEET.SDK_LOADING,
      });
      (NavigationService.navigation?.canGoBack as jest.Mock).mockReturnValue(
        false,
      );
      await hideLoadingState({
        instance: mockInstance,
      });

      expect(NavigationService.navigation.goBack).not.toHaveBeenCalled();
    });
  });
});
