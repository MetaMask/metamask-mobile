import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import goToRamps, { RampMode } from './goToRamps';
import {
  createBuyNavigationDetails,
  createSellNavigationDetails,
} from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';
import { RampType as AggregatorRampType } from '../Aggregator/types';

jest.mock('../Aggregator/routes/utils');
jest.mock('../Deposit/routes/utils');

describe('goToRamps', () => {
  let navigation: NavigationProp<ParamListBase>;
  const mockCreateBuyNavigationDetails =
    createBuyNavigationDetails as jest.MockedFunction<
      typeof createBuyNavigationDetails
    >;
  const mockCreateSellNavigationDetails =
    createSellNavigationDetails as jest.MockedFunction<
      typeof createSellNavigationDetails
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

    mockCreateSellNavigationDetails.mockReturnValue([
      Routes.RAMP.SELL,
    ] as unknown as ReturnType<typeof createSellNavigationDetails>);

    mockCreateDepositNavigationDetails.mockReturnValue([
      Routes.DEPOSIT.ID,
    ] as unknown as ReturnType<typeof createDepositNavigationDetails>);
  });

  describe('RampMode.AGGREGATOR', () => {
    it('navigates to buy route when mode is AGGREGATOR without params (defaults to BUY)', () => {
      const mockNavDetails = [Routes.RAMP.BUY] as const;
      mockCreateBuyNavigationDetails.mockReturnValue(mockNavDetails);

      goToRamps(navigation, RampMode.AGGREGATOR);

      expect(mockCreateBuyNavigationDetails).toHaveBeenCalledWith(undefined);
      expect(navigation.navigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateSellNavigationDetails).not.toHaveBeenCalled();
      expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
    });

    it('navigates to buy route when mode is AGGREGATOR with rampType BUY', () => {
      const mockNavDetails = [Routes.RAMP.BUY] as const;
      mockCreateBuyNavigationDetails.mockReturnValue(mockNavDetails);

      goToRamps(navigation, RampMode.AGGREGATOR, {
        rampType: AggregatorRampType.BUY,
      });

      expect(mockCreateBuyNavigationDetails).toHaveBeenCalledWith(undefined);
      expect(navigation.navigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateSellNavigationDetails).not.toHaveBeenCalled();
    });

    it('navigates to sell route when mode is AGGREGATOR with rampType SELL', () => {
      const mockNavDetails = [Routes.RAMP.SELL] as const;
      mockCreateSellNavigationDetails.mockReturnValue(mockNavDetails);

      goToRamps(navigation, RampMode.AGGREGATOR, {
        rampType: AggregatorRampType.SELL,
      });

      expect(mockCreateSellNavigationDetails).toHaveBeenCalledWith(undefined);
      expect(navigation.navigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateBuyNavigationDetails).not.toHaveBeenCalled();
    });

    it('passes intent to createBuyNavigationDetails when provided', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };
      const mockNavDetails = [Routes.RAMP.BUY] as const;
      mockCreateBuyNavigationDetails.mockReturnValue(mockNavDetails);

      goToRamps(navigation, RampMode.AGGREGATOR, {
        intent,
        rampType: AggregatorRampType.BUY,
      });

      expect(mockCreateBuyNavigationDetails).toHaveBeenCalledWith(intent);
      expect(navigation.navigate).toHaveBeenCalledWith(...mockNavDetails);
    });

    it('passes intent to createSellNavigationDetails when provided', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };
      const mockNavDetails = [Routes.RAMP.SELL] as const;
      mockCreateSellNavigationDetails.mockReturnValue(mockNavDetails);

      goToRamps(navigation, RampMode.AGGREGATOR, {
        intent,
        rampType: AggregatorRampType.SELL,
      });

      expect(mockCreateSellNavigationDetails).toHaveBeenCalledWith(intent);
      expect(navigation.navigate).toHaveBeenCalledWith(...mockNavDetails);
    });
  });

  describe('RampMode.DEPOSIT', () => {
    it('navigates to deposit route when mode is DEPOSIT without params', () => {
      const mockNavDetails = [Routes.DEPOSIT.ID] as const;
      mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

      goToRamps(navigation, RampMode.DEPOSIT);

      expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith(
        undefined,
      );
      expect(navigation.navigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateBuyNavigationDetails).not.toHaveBeenCalled();
      expect(mockCreateSellNavigationDetails).not.toHaveBeenCalled();
    });

    it('passes params to createDepositNavigationDetails when provided', () => {
      const params = { assetId: 'eip155:1/erc20:0x123', amount: '100' };
      const mockNavDetails = [Routes.DEPOSIT.ID] as const;
      mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

      goToRamps(navigation, RampMode.DEPOSIT, params);

      expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith(params);
      expect(navigation.navigate).toHaveBeenCalledWith(...mockNavDetails);
    });
  });

  it('throws error for invalid mode', () => {
    const invalidMode = 'invalid' as RampMode;

    expect(() => goToRamps(navigation, invalidMode)).toThrow(
      `Invalid ramp mode: ${invalidMode}. Must be ${RampMode.AGGREGATOR} or ${RampMode.DEPOSIT}`,
    );
  });
});
