import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { RampType } from '../types';
import Routes from '../../../../constants/navigation/Routes';
import handleRampUrl from './handleRampUrl';
import handleRedirection from './handleRedirection';

jest.mock('@react-navigation/native');
jest.mock('./handleRedirection');

describe('handleRampUrl', () => {
  let navigation: NavigationProp<ParamListBase>;

  beforeEach(() => {
    navigation = {
      navigate: jest.fn(),
    } as unknown as NavigationProp<ParamListBase>;

    (handleRedirection as jest.Mock).mockClear();
  });

  it('handles redirection with the paths', () => {
    handleRampUrl({
      rampPath: '/somePath?as=example',
      rampType: RampType.BUY,
      navigation,
    });
    expect(handleRedirection).toHaveBeenCalledWith(
      ['somePath'],
      { as: 'example' },
      RampType.BUY,
      navigation,
    );
  });

  it('navigates to Buy route when rampType is BUY, redirectPaths length is 0 and query params do not have allowed fields', () => {
    handleRampUrl({
      rampPath: '?as=example',
      rampType: RampType.BUY,
      navigation,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.RAMP.BUY);
  });

  it('navigates to Sell route when rampType is SELL, redirectPaths length is 0 and query param do not have allowed fields', () => {
    handleRampUrl({
      rampPath: '?as=example',
      rampType: RampType.SELL,
      navigation,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.RAMP.SELL);
  });

  it('navigates to Buy route when rampType is BUY, redirectPaths length is 0 and query param is intent', () => {
    handleRampUrl({
      rampPath: '?chainId=1&address=0x123456',
      rampType: RampType.BUY,
      navigation,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.RAMP.BUY, {
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
      navigation,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.RAMP.SELL, {
      screen: Routes.RAMP.GET_STARTED,
      params: {
        chainId: '1',
        address: '0x123456',
      },
    });
  });
});
