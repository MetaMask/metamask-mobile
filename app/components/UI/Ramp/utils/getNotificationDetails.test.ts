import { DepositOrderType } from '../types/legacyDeposit';
import getNotificationDetails from './getNotificationDetails';
import { getNotificationDetails as getAggregatorNotificationDetails } from '../Aggregator/utils';
import { getNotificationDetails as getDepositNotificationDetails } from '../utils/depositUtils';
import { FiatOrder } from '../../../../reducers/fiatOrders';

jest.mock('../Aggregator/utils', () => ({
  getNotificationDetails: jest.fn(),
}));

jest.mock('../utils/depositUtils', () => ({
  getNotificationDetails: jest.fn(),
}));

describe('getNotificationDetails', () => {
  const mockAggregatorNotificationDetails =
    getAggregatorNotificationDetails as jest.MockedFunction<
      typeof getAggregatorNotificationDetails
    >;
  const mockDepositNotificationDetails =
    getDepositNotificationDetails as jest.MockedFunction<
      typeof getDepositNotificationDetails
    >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use deposit notification details when orderType is DepositOrderType.Deposit', () => {
    const mockOrder = { orderType: DepositOrderType.Deposit } as FiatOrder;
    const mockNotificationDetails = {
      title: 'Deposit Test',
      description: 'Test',
      status: 'success',
      duration: 5000,
    };

    mockDepositNotificationDetails.mockReturnValue(mockNotificationDetails);

    const result = getNotificationDetails(mockOrder);

    expect(mockDepositNotificationDetails).toHaveBeenCalledWith(mockOrder);
    expect(mockAggregatorNotificationDetails).not.toHaveBeenCalled();
    expect(result).toBe(mockNotificationDetails);
  });

  it('should use aggregator notification details for any other orderType', () => {
    const mockOrder = { orderType: 'BUY' } as unknown as FiatOrder;
    const mockNotificationDetails = {
      title: 'Aggregator Test',
      description: 'Test',
      status: 'success',
      duration: 5000,
    };

    mockAggregatorNotificationDetails.mockReturnValue(mockNotificationDetails);

    const result = getNotificationDetails(mockOrder);

    expect(mockAggregatorNotificationDetails).toHaveBeenCalledWith(mockOrder);
    expect(mockDepositNotificationDetails).not.toHaveBeenCalled();
    expect(result).toBe(mockNotificationDetails);
  });

  it('should use aggregator notification details when orderType is undefined', () => {
    const mockOrder = {} as FiatOrder;
    const mockNotificationDetails = {
      title: 'Aggregator Test',
      description: 'Test',
      status: 'success',
      duration: 5000,
    };

    mockAggregatorNotificationDetails.mockReturnValue(mockNotificationDetails);

    const result = getNotificationDetails(mockOrder);

    expect(mockAggregatorNotificationDetails).toHaveBeenCalledWith(mockOrder);
    expect(mockDepositNotificationDetails).not.toHaveBeenCalled();
    expect(result).toBe(mockNotificationDetails);
  });
});
