import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { RampType } from '../types';
import Routes from '../../../../constants/navigation/Routes';
import handleRampUrl from './handleRampUrl';

jest.mock('@react-navigation/native');

describe('handleRampUrl', () => {
  let navigation: NavigationProp<ParamListBase>;

  beforeEach(() => {
    navigation = {
      navigate: jest.fn(),
    } as unknown as NavigationProp<ParamListBase>;
  });

  it('should navigate to BUY route when rampType is BUY', () => {
    handleRampUrl({
      rampPath: '/somePath?as=example',
      rampType: RampType.BUY,
      navigation,
    });
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.RAMP.BUY);
  });

  it('should navigate to SELL route when rampType is SELL', () => {
    handleRampUrl({
      rampPath: '/somePath?as=example',
      rampType: RampType.SELL,
      navigation,
    });
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.RAMP.SELL);
  });
});
