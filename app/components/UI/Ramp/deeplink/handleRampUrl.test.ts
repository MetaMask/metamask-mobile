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

  it('should call handle redirection with the paths', () => {
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

  it('should navigate to Buy route when rampType is BUY and redirectPaths length is 0', () => {
    handleRampUrl({
      rampPath: '?as=example',
      rampType: RampType.BUY,
      navigation,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.RAMP.BUY);
  });
  it('should navigate to Sell route when rampType is SELL and redirectPaths length is 0', () => {
    handleRampUrl({
      rampPath: '?as=example',
      rampType: RampType.SELL,
      navigation,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.RAMP.SELL);
  });
});
