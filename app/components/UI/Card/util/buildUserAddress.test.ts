import {
  buildProvisioningUserAddress,
  buildShippingAddress,
  buildCardholderName,
} from './buildUserAddress';
import { UserResponse } from '../types';

describe('buildUserAddress utilities', () => {
  const mockFullUserDetails: UserResponse = {
    id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Main St',
    addressLine2: 'Apt 4B',
    city: 'New York',
    usState: 'NY',
    zip: '10001',
    phoneNumber: '5551234567',
    mailingAddressLine1: '456 Mailing Ave',
    mailingAddressLine2: 'Suite 100',
    mailingCity: 'Mailing City',
    mailingUsState: 'CA',
    mailingZip: '90210',
  };

  describe('buildProvisioningUserAddress', () => {
    it('returns undefined when userDetails is null or undefined', () => {
      expect(buildProvisioningUserAddress(null, 'John Doe')).toBeUndefined();
      expect(
        buildProvisioningUserAddress(undefined, 'John Doe'),
      ).toBeUndefined();
    });

    it('returns undefined when required fields are missing', () => {
      expect(
        buildProvisioningUserAddress(
          { id: 'test', city: 'NYC', zip: '10001' },
          'Name',
        ),
      ).toBeUndefined();
      expect(
        buildProvisioningUserAddress(
          { id: 'test', addressLine1: '123 St', zip: '10001' },
          'Name',
        ),
      ).toBeUndefined();
      expect(
        buildProvisioningUserAddress(
          { id: 'test', addressLine1: '123 St', city: 'NYC' },
          'Name',
        ),
      ).toBeUndefined();
    });

    it('builds UserAddress from physical address fields only', () => {
      const result = buildProvisioningUserAddress(
        mockFullUserDetails,
        'John Doe',
      );

      expect(result).toEqual({
        name: 'John Doe',
        addressOne: '123 Main St',
        addressTwo: 'Apt 4B',
        locality: 'New York',
        administrativeArea: 'NY',
        postalCode: '10001',
        countryCode: 'US',
        phoneNumber: '5551234567',
      });
    });

    it('handles missing optional fields with defaults', () => {
      const result = buildProvisioningUserAddress(
        { id: 'test', addressLine1: '123 St', city: 'NYC', zip: '10001' },
        'Name',
      );

      expect(result?.addressTwo).toBeUndefined();
      expect(result?.administrativeArea).toBe('');
      expect(result?.phoneNumber).toBe('');
    });
  });

  describe('buildShippingAddress', () => {
    it('returns undefined when userDetails is null or undefined', () => {
      expect(buildShippingAddress(null)).toBeUndefined();
      expect(buildShippingAddress(undefined)).toBeUndefined();
    });

    it('prefers mailing address when complete', () => {
      const result = buildShippingAddress(mockFullUserDetails);

      expect(result).toEqual({
        line1: '456 Mailing Ave',
        line2: 'Suite 100',
        city: 'Mailing City',
        state: 'CA',
        zip: '90210',
      });
    });

    it('falls back to physical address when mailing is incomplete', () => {
      const userDetails: UserResponse = {
        id: 'test',
        mailingAddressLine1: '123 Mail St',
        // Missing mailingCity and mailingZip
        addressLine1: '789 Physical Rd',
        city: 'Physical City',
        usState: 'TX',
        zip: '75001',
      };

      const result = buildShippingAddress(userDetails);

      expect(result?.line1).toBe('789 Physical Rd');
      expect(result?.city).toBe('Physical City');
    });

    it('returns undefined when neither address is complete', () => {
      const result = buildShippingAddress({ id: 'test', firstName: 'Test' });
      expect(result).toBeUndefined();
    });
  });

  describe('buildCardholderName', () => {
    it('returns default fallback when userDetails is null or undefined', () => {
      expect(buildCardholderName(null)).toBe('Card Holder');
      expect(buildCardholderName(undefined)).toBe('Card Holder');
    });

    it('returns custom fallback when provided', () => {
      expect(buildCardholderName(null, 'Unknown')).toBe('Unknown');
    });

    it('returns full name when both firstName and lastName present', () => {
      expect(buildCardholderName(mockFullUserDetails)).toBe('John Doe');
    });

    it('returns single name when only one is present', () => {
      expect(buildCardholderName({ id: 'test', firstName: 'Alice' })).toBe(
        'Alice',
      );
      expect(buildCardholderName({ id: 'test', lastName: 'Smith' })).toBe(
        'Smith',
      );
    });

    it('returns fallback when names are empty or null', () => {
      expect(
        buildCardholderName({ id: 'test', firstName: '', lastName: '' }),
      ).toBe('Card Holder');
      expect(
        buildCardholderName({ id: 'test', firstName: null, lastName: null }),
      ).toBe('Card Holder');
    });
  });
});
