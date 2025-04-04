import hideLoadingState from './hideLoadingState'; // Adjust the import path as necessary
import Routes from '../../../constants/navigation/Routes';
import SDKConnect from '../SDKConnect';

jest.mock('../../../constants/navigation/Routes');
jest.mock('../SDKConnect');

describe('hideLoadingState', () => {
  let mockInstance = {} as unknown as SDKConnect;

  const mockGetCurrentRoute = jest.fn();
  const mockCanGoBack = jest.fn();
  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstance = {
      state: {
        sdkLoadingState: {},
        navigation: {
          getCurrentRoute: mockGetCurrentRoute,
          canGoBack: mockCanGoBack,
          goBack: mockGoBack,
        },
      },
    } as unknown as SDKConnect;
  });

  it('should clear the SDK loading state', async () => {
    const mockRouteName = 'mockRouteName';
    const mockCanGoBackValue = true;
    mockGetCurrentRoute.mockReturnValue({ name: mockRouteName });
    mockCanGoBack.mockReturnValue(mockCanGoBackValue);

    await hideLoadingState({
      instance: mockInstance,
    });

    expect(mockInstance.state.sdkLoadingState).toEqual({});
  });

  describe('Navigation handling', () => {
    it('should check the current route name', async () => {
      const mockRouteName = 'mockRouteName';
      mockGetCurrentRoute.mockReturnValue({ name: mockRouteName });

      await hideLoadingState({
        instance: mockInstance,
      });

      expect(mockGetCurrentRoute).toHaveBeenCalled();
    });

    it('should go back if the current route is SDK_LOADING and can go back', async () => {
      const mockRouteName = Routes.SHEET.SDK_LOADING;
      const mockCanGoBackValue = true;
      mockGetCurrentRoute.mockReturnValue({ name: mockRouteName });
      mockCanGoBack.mockReturnValue(mockCanGoBackValue);

      await hideLoadingState({
        instance: mockInstance,
      });

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should not go back if the current route is not SDK_LOADING', async () => {
      const mockRouteName = 'mockRouteName';
      const mockCanGoBackValue = true;
      mockGetCurrentRoute.mockReturnValue({ name: mockRouteName });
      mockCanGoBack.mockReturnValue(mockCanGoBackValue);

      await hideLoadingState({
        instance: mockInstance,
      });

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('should not go back if cannot go back', async () => {
      const mockRouteName = Routes.SHEET.SDK_LOADING;

      mockGetCurrentRoute.mockReturnValue({ name: mockRouteName });
      mockCanGoBack.mockReturnValue(false);

      await hideLoadingState({
        instance: mockInstance,
      });

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });
});
