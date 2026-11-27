import type { AccountGroupId } from '@metamask/account-api';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { AddressListViewedSource } from '../../../../util/analytics/addressListViewedTracking';
import Logger from '../../../../util/Logger';
import { navigateToReceiveAddressList } from './navigateToReceiveAddressList';

const mockNavigateWithDetails = jest.fn();
jest.mock('../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../util/navigation/navUtils'),
  navigateWithDetails: (...args: unknown[]) => mockNavigateWithDetails(...args),
}));

const mockCreateAddressListNavigationDetails = jest.fn((params: unknown) => ({
  details: params,
}));
jest.mock('./AddressList', () => ({
  createAddressListNavigationDetails: (params: unknown) =>
    mockCreateAddressListNavigationDetails(params),
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const navigation = { navigate: jest.fn() } as unknown as AppNavigationProp;
const groupId = 'entropy:wallet/0' as AccountGroupId;

describe('navigateToReceiveAddressList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the receiving address list with the given source and returns true', () => {
    const result = navigateToReceiveAddressList({
      navigation,
      groupId,
      source: AddressListViewedSource.RECEIVE_BUTTON,
      caller: 'Wallet::onReceive',
    });

    expect(result).toBe(true);
    expect(mockCreateAddressListNavigationDetails).toHaveBeenCalledWith({
      groupId,
      title: 'Receiving address',
      source: AddressListViewedSource.RECEIVE_BUTTON,
    });
    expect(mockNavigateWithDetails).toHaveBeenCalledWith(navigation, {
      details: expect.objectContaining({ groupId }),
    });
  });

  it.each([null, undefined])(
    'logs with the caller prefix, skips navigation and returns false when groupId is %s',
    (missingGroupId) => {
      const result = navigateToReceiveAddressList({
        navigation,
        groupId: missingGroupId,
        source: AddressListViewedSource.ONBOARDING_CHECKLIST,
        caller: 'WalletHomeOnboardingSteps::onReceive',
      });

      expect(result).toBe(false);
      expect(Logger.error).toHaveBeenCalledWith(
        new Error(
          'WalletHomeOnboardingSteps::onReceive - Missing selectedAccountGroupId',
        ),
      );
      expect(mockNavigateWithDetails).not.toHaveBeenCalled();
    },
  );
});
