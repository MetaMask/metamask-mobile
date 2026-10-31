import Routes from '../../../../constants/navigation/Routes';
import handleRampReturnUrl from './handleRampReturnUrl';
import NavigationService from '../../../../core/NavigationService';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';

jest.mock('../../../../core/NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../core/redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(() => ({})),
    },
  },
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: jest.fn(),
}));

describe('handleRampReturnUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      selectSelectedInternalAccountAddress as unknown as jest.Mock
    ).mockReturnValue(undefined);
  });

  it('navigates to RAMPS_ORDER_DETAILS with orderId from query string', () => {
    handleRampReturnUrl({ rampReturnPath: '?orderId=abc123' });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      {
        orderId: 'abc123',
        showCloseButton: true,
        callbackUrl: 'metamask://on-ramp/?orderId=abc123',
      },
    );
  });

  it('parses orderId from a path with leading slash', () => {
    handleRampReturnUrl({ rampReturnPath: '/return?orderId=order-42' });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      {
        orderId: 'order-42',
        showCloseButton: true,
        callbackUrl: 'metamask://on-ramp/return?orderId=order-42',
      },
    );
  });

  it('parses orderId from an absolute URL', () => {
    handleRampReturnUrl({
      rampReturnPath: 'https://example.com/return?orderId=zzz',
    });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      {
        orderId: 'zzz',
        showCloseButton: true,
        callbackUrl: 'https://example.com/return?orderId=zzz',
      },
    );
  });

  it('navigates with undefined orderId when the query parameter is absent', () => {
    handleRampReturnUrl({ rampReturnPath: '?other=value' });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      {
        orderId: undefined,
        showCloseButton: true,
        callbackUrl: 'metamask://on-ramp/?other=value',
      },
    );
  });

  it('navigates with undefined orderId when there is no query string', () => {
    handleRampReturnUrl({ rampReturnPath: '/some-path' });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      {
        orderId: undefined,
        showCloseButton: true,
        callbackUrl: 'metamask://on-ramp/some-path',
      },
    );
  });

  it('passes the Revolut return URL, provider code, and selected wallet', () => {
    (
      selectSelectedInternalAccountAddress as unknown as jest.Mock
    ).mockReturnValue('0xwallet');

    handleRampReturnUrl({
      rampReturnPath: '/providers/revolut?orderId=REV-1',
    });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      {
        orderId: 'REV-1',
        showCloseButton: true,
        callbackUrl: 'metamask://on-ramp/providers/revolut?orderId=REV-1',
        providerCode: 'revolut',
        walletAddress: '0xwallet',
      },
    );
  });

  it('navigates with undefined orderId for an empty path', () => {
    handleRampReturnUrl({ rampReturnPath: '' });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      { orderId: undefined, showCloseButton: true },
    );
  });

  it('logs an error and does not navigate when the URL constructor throws', () => {
    handleRampReturnUrl({ rampReturnPath: 'http://[' });

    expect(Logger.error).toHaveBeenCalled();
    expect(NavigationService.navigation.navigate).not.toHaveBeenCalled();
  });
});
