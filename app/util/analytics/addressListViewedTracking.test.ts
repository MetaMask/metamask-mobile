import { KeyringTypes } from '@metamask/keyring-controller';
import {
  AddressListViewedSource,
  getAddressListViewedAccountType,
  trackAddressListViewed,
  AddressListViewedProperties,
} from './addressListViewedTracking';
import {
  createMockSnapInternalAccount,
  internalAccount1,
  internalSolanaAccount1,
} from '../../util/test/accountsControllerTestUtils';
import { getAddressAccountType } from '../address';
import { MetaMetricsEvents } from '../../core/Analytics';
import { ITrackingEvent } from './analytics.types';

jest.mock('../../core/Analytics');
jest.mock('../address', () => ({
  ...jest.requireActual('../address'),
  getAddressAccountType: jest.fn(),
}));

const mockGetAddressAccountType = jest.mocked(getAddressAccountType);

describe('addressListViewedTracking', () => {
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockAddProperties = jest.fn();
  const mockBuild = jest.fn();

  const mockProperties: AddressListViewedProperties = {
    source: AddressListViewedSource.COPY_BUTTON,
    account_type: 'MetaMask',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
    mockAddProperties.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
    mockBuild.mockReturnValue({
      name: 'Address List Viewed',
      properties: mockProperties,
      sensitiveProperties: {},
      isAnonymous: false,
      hasProperties: true,
    } as ITrackingEvent);
  });

  describe('getAddressListViewedAccountType', () => {
    it('returns MetaMask when accounts array is empty', () => {
      expect(getAddressListViewedAccountType([])).toBe('MetaMask');
    });

    it('returns keyring metadata for non-EVM addresses', () => {
      expect(getAddressListViewedAccountType([internalSolanaAccount1])).toBe(
        KeyringTypes.snap,
      );
      expect(mockGetAddressAccountType).not.toHaveBeenCalled();
    });

    it('returns getAddressAccountType for EVM addresses when available', () => {
      mockGetAddressAccountType.mockReturnValue('MetaMask');

      expect(getAddressListViewedAccountType([internalAccount1])).toBe(
        'MetaMask',
      );
      expect(mockGetAddressAccountType).toHaveBeenCalledWith(
        internalAccount1.address,
      );
    });

    it('falls back to keyring metadata when getAddressAccountType throws', () => {
      mockGetAddressAccountType.mockImplementation(() => {
        throw new Error('The address is not imported');
      });

      const snapAccount = createMockSnapInternalAccount(
        internalAccount1.address,
        'Snap Account',
      );

      expect(getAddressListViewedAccountType([snapAccount])).toBe(
        KeyringTypes.snap,
      );
    });
  });

  describe('trackAddressListViewed', () => {
    it('creates event with ADDRESS_LIST_VIEWED', () => {
      trackAddressListViewed(
        mockTrackEvent,
        mockCreateEventBuilder,
        mockProperties,
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ADDRESS_LIST_VIEWED,
      );
    });

    it('adds properties to the event builder', () => {
      trackAddressListViewed(
        mockTrackEvent,
        mockCreateEventBuilder,
        mockProperties,
      );

      expect(mockAddProperties).toHaveBeenCalledWith(mockProperties);
    });

    it('builds and tracks the event', () => {
      trackAddressListViewed(
        mockTrackEvent,
        mockCreateEventBuilder,
        mockProperties,
      );

      expect(mockBuild).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Address List Viewed',
        }),
      );
    });
  });
});
