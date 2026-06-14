import NavigationService from '../NavigationService';
import Routes from '../../constants/navigation/Routes';
import {
  hideAgenticCliOtpCode,
  showAgenticCliOtpCode,
} from './agenticCliOtpUi';
import { ConnectionInfo } from '../SDKConnectV2/types/connection-info';

jest.mock('../NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      getCurrentRoute: jest.fn(() => ({ name: 'SDKConnectV2Otp' })),
    },
  },
}));

const createMockConnectionInfo = (): ConnectionInfo => ({
  id: 'session-123',
  metadata: {
    dapp: {
      name: 'Agentic CLI DApp',
      url: 'https://testdapp.com',
    },
    sdk: {
      version: '2.1.0',
      platform: 'JavaScript',
    },
  },
  expiresAt: Date.now() + 1000 * 60 * 60,
});

describe('agenticCliOtpUi', () => {
  describe('showAgenticCliOtpCode', () => {
    it('navigates to the OTP bottom sheet with otp, dappName and deadline params', () => {
      const navigateSpy = NavigationService.navigation.navigate as jest.Mock;
      navigateSpy.mockClear();

      const connInfo = createMockConnectionInfo();
      const deadline = Date.now() + 60_000;

      showAgenticCliOtpCode(connInfo, '4892AKJ7', deadline);

      expect(navigateSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SDK_CONNECT_V2_OTP,
        params: {
          otp: '4892AKJ7',
          dappName: connInfo.metadata.dapp.name,
          deadline,
        },
      });
    });
  });

  describe('hideAgenticCliOtpCode', () => {
    let goBackSpy: jest.Mock;
    let getCurrentRouteSpy: jest.Mock;
    let canGoBackSpy: jest.Mock;

    beforeEach(() => {
      goBackSpy = NavigationService.navigation.goBack as jest.Mock;
      getCurrentRouteSpy = NavigationService.navigation
        .getCurrentRoute as jest.Mock;
      canGoBackSpy = NavigationService.navigation.canGoBack as jest.Mock;
      goBackSpy.mockClear();
      getCurrentRouteSpy.mockClear();
      canGoBackSpy.mockClear();
    });

    it('pops the OTP route when it is the current screen', () => {
      getCurrentRouteSpy.mockReturnValue({
        name: Routes.SHEET.SDK_CONNECT_V2_OTP,
      });
      canGoBackSpy.mockReturnValue(true);

      hideAgenticCliOtpCode(createMockConnectionInfo());

      expect(goBackSpy).toHaveBeenCalledTimes(1);
    });

    it('does nothing when the current route is not the OTP modal', () => {
      getCurrentRouteSpy.mockReturnValue({ name: 'SomeOtherScreen' });
      canGoBackSpy.mockReturnValue(true);

      hideAgenticCliOtpCode(createMockConnectionInfo());

      expect(goBackSpy).not.toHaveBeenCalled();
    });

    it('does nothing when there is nothing to go back to', () => {
      getCurrentRouteSpy.mockReturnValue({
        name: Routes.SHEET.SDK_CONNECT_V2_OTP,
      });
      canGoBackSpy.mockReturnValue(false);

      hideAgenticCliOtpCode(createMockConnectionInfo());

      expect(goBackSpy).not.toHaveBeenCalled();
    });
  });
});
