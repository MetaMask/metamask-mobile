import Routes from '../../../../../constants/navigation/Routes';
import handleDepositUrl from './handleDepositUrl';
import NavigationService from '../../../../../core/NavigationService';

jest.mock('@react-navigation/native');

jest.mock('../../../../../core/NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

describe('handleDepositUrl', () => {
  beforeEach(() => {
    (NavigationService.navigation.navigate as jest.Mock).mockClear();
  });

  it('navigates to Deposit route when query params do not have allowed fields', () => {
    handleDepositUrl({
      depositPath: '?as=example',
    });
    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.DEPOSIT.ID,
    );
  });

  it('navigates to Deposit route when query params are allowed', () => {
    handleDepositUrl({
      depositPath:
        '?assetId=eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
    });
    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.DEPOSIT.ID,
      {
        screen: Routes.DEPOSIT.ROOT,
        params: {
          assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
        },
      },
    );
  });

  it('navigates to Deposit route when query params are encoded and allowed', () => {
    handleDepositUrl({
      depositPath:
        '?assetId=eip155%3A1%2Ferc20%3A0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
    });
    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.DEPOSIT.ID,
      {
        screen: Routes.DEPOSIT.ROOT,
        params: {
          assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
        },
      },
    );
  });
});
