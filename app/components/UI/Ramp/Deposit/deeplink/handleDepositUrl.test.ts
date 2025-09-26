import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import handleDepositUrl from './handleDepositUrl';

jest.mock('@react-navigation/native');

describe('handleDepositUrl', () => {
  let navigation: NavigationProp<ParamListBase>;

  beforeEach(() => {
    navigation = {
      navigate: jest.fn(),
    } as unknown as NavigationProp<ParamListBase>;
  });

  it('navigates to Deposit route when query params do not have allowed fields', () => {
    handleDepositUrl({
      depositPath: '?as=example',
      navigation,
    });
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.DEPOSIT.ID);
  });

  it('navigates to Deposit route when query params are allowed', () => {
    handleDepositUrl({
      depositPath:
        '?assetId=eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      navigation,
    });
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.DEPOSIT.ID, {
      screen: Routes.DEPOSIT.ID,
      params: {
        assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      },
    });
  });

  it('navigates to Deposit route when query params are encoded and allowed', () => {
    handleDepositUrl({
      depositPath:
        '?assetId=eip155%3A1%2Ferc20%3A0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      navigation,
    });
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.DEPOSIT.ID, {
      screen: Routes.DEPOSIT.ID,
      params: {
        assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      },
    });
  });
});
