import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { goToRamps, RampType } from './goToRamps';
import { createBuyNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';

jest.mock('../Aggregator/routes/utils');
jest.mock('../Deposit/routes/utils');

describe('goToRamps', () => {
  let navigation: NavigationProp<ParamListBase>;
  const mockCreateBuyNavigationDetails =
    createBuyNavigationDetails as jest.MockedFunction<
      typeof createBuyNavigationDetails
    >;
  const mockCreateDepositNavigationDetails =
    createDepositNavigationDetails as jest.MockedFunction<
      typeof createDepositNavigationDetails
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    navigation = {
      navigate: jest.fn(),
    } as unknown as NavigationProp<ParamListBase>;

    mockCreateBuyNavigationDetails.mockReturnValue([
      Routes.RAMP.BUY,
    ] as unknown as ReturnType<typeof createBuyNavigationDetails>);

    mockCreateDepositNavigationDetails.mockReturnValue([
      Routes.DEPOSIT.ID,
    ] as unknown as ReturnType<typeof createDepositNavigationDetails>);
  });

  it('should navigate to aggregator route when type is RampType.AGGREGATOR', () => {
    const mockNavDetails = [Routes.RAMP.BUY] as const;
    mockCreateBuyNavigationDetails.mockReturnValue(mockNavDetails);

    goToRamps(navigation, RampType.AGGREGATOR);

    expect(mockCreateBuyNavigationDetails).toHaveBeenCalledWith();
    expect(navigation.navigate).toHaveBeenCalledWith(...mockNavDetails);
    expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
  });

  it('should navigate to deposit route when type is RampType.DEPOSIT', () => {
    const mockNavDetails = [Routes.DEPOSIT.ID] as const;
    mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

    goToRamps(navigation, RampType.DEPOSIT);

    expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith();
    expect(navigation.navigate).toHaveBeenCalledWith(...mockNavDetails);
    expect(mockCreateBuyNavigationDetails).not.toHaveBeenCalled();
  });

  it('should throw error for invalid type', () => {
    const invalidType = 'invalid' as RampType;

    expect(() => goToRamps(navigation, invalidType)).toThrow(
      `Invalid ramp type: ${invalidType}. Must be ${RampType.AGGREGATOR} or ${RampType.DEPOSIT}`,
    );
  });
});
