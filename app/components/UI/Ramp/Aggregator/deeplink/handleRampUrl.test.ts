import { RampType } from '../types';
import Routes from '../../../../../constants/navigation/Routes';
import handleRampUrl from './handleRampUrl';
import handleRedirection from './handleRedirection';
import NavigationService from '../../../../../core/NavigationService';

jest.mock('@react-navigation/native');
jest.mock('./handleRedirection');
jest.mock('../../../../../core/NavigationService');

describe('handleRampUrl', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    mockNavigate = jest.fn();

    // Mock NavigationService.navigation getter
    Object.defineProperty(NavigationService, 'navigation', {
      get: () => ({
        navigate: mockNavigate,
      }),
      configurable: true,
    });

    (handleRedirection as jest.Mock).mockClear();
  });

  it('handles redirection with the paths', () => {
    handleRampUrl({
      rampPath: '/somePath?as=example',
      rampType: RampType.BUY,
    });
    expect(handleRedirection).toHaveBeenCalledWith(
      ['somePath'],
      { as: 'example' },
      RampType.BUY,
    );
  });

  it('navigates to Buy route when rampType is BUY, redirectPaths length is 0 and query params do not have allowed fields', () => {
    handleRampUrl({
      rampPath: '?as=example',
      rampType: RampType.BUY,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY);
  });

  it('navigates to Sell route when rampType is SELL, redirectPaths length is 0 and query param do not have allowed fields', () => {
    handleRampUrl({
      rampPath: '?as=example',
      rampType: RampType.SELL,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.SELL);
  });

  it('navigates to Buy route when rampType is BUY, redirectPaths length is 0 and query param is intent', () => {
    handleRampUrl({
      rampPath: '?chainId=1&address=0x123456',
      rampType: RampType.BUY,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY, {
      screen: Routes.RAMP.GET_STARTED,
      params: {
        chainId: '1',
        address: '0x123456',
      },
    });
  });

  it('navigates to Sell route when rampType is SELL, redirectPaths length is 0 and query param is intent', () => {
    handleRampUrl({
      rampPath: '?chainId=1&address=0x123456',
      rampType: RampType.SELL,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.SELL, {
      screen: Routes.RAMP.GET_STARTED,
      params: {
        chainId: '1',
        address: '0x123456',
      },
    });
  });
});
