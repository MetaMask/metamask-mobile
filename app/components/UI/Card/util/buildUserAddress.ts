/**
 * User Address Building Utilities
 *
 * Helper functions for building user address objects from KYC user details.
 * Used for Google Wallet provisioning and metal card ordering.
 */

import { UserResponse } from '../types';
import { UserAddress } from '../pushProvisioning/types';

/**
 * Shipping address format used for metal card ordering
 */
export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

/**
 * Build a UserAddress object for Google Wallet provisioning
 *
 * Extracts physical address from user details.
 * Returns undefined if required address fields are missing.
 *
 * @param userDetails - User details from KYC status
 * @param cardholderName - Full name of the cardholder
 * @returns UserAddress for provisioning, or undefined if incomplete
 */
export function buildProvisioningUserAddress(
  userDetails: UserResponse | null | undefined,
  cardholderName: string,
): UserAddress | undefined {
  if (!userDetails) {
    return undefined;
  }

  const { addressLine1, addressLine2, city, usState, zip, phoneNumber } =
    userDetails;

  // Require at least address line 1, city, and zip
  if (!addressLine1 || !city || !zip) {
    return undefined;
  }

  return {
    name: cardholderName,
    addressOne: addressLine1,
    addressTwo: addressLine2 ?? undefined,
    locality: city,
    administrativeArea: usState ?? '',
    postalCode: zip,
    countryCode: 'US',
    phoneNumber: phoneNumber ?? '',
  };
}

/**
 * Build a ShippingAddress object for metal card ordering
 *
 * Extracts address from user details, preferring mailing address over physical.
 * Returns undefined if required address fields are missing.
 *
 * @param userDetails - User details from KYC status
 * @returns ShippingAddress for metal card ordering, or undefined if incomplete
 */
export function buildShippingAddress(
  userDetails: UserResponse | null | undefined,
): ShippingAddress | undefined {
  if (!userDetails) {
    return undefined;
  }

  // Try mailing address first
  const mailingLine1 = userDetails.mailingAddressLine1;
  const mailingCity = userDetails.mailingCity;
  const mailingZip = userDetails.mailingZip;

  if (mailingLine1 && mailingCity && mailingZip) {
    return {
      line1: mailingLine1,
      line2: userDetails.mailingAddressLine2 ?? undefined,
      city: mailingCity,
      state: userDetails.mailingUsState ?? '',
      zip: mailingZip,
    };
  }

  // Fall back to physical address
  const physicalLine1 = userDetails.addressLine1;
  const physicalCity = userDetails.city;
  const physicalZip = userDetails.zip;

  if (physicalLine1 && physicalCity && physicalZip) {
    return {
      line1: physicalLine1,
      line2: userDetails.addressLine2 ?? undefined,
      city: physicalCity,
      state: userDetails.usState ?? '',
      zip: physicalZip,
    };
  }

  return undefined;
}

/**
 * Build cardholder full name from user details
 *
 * @param userDetails - User details from KYC status
 * @param fallback - Fallback name if user details are incomplete (default: 'Card Holder')
 * @returns Full cardholder name
 */
export function buildCardholderName(
  userDetails: UserResponse | null | undefined,
  fallback = 'Card Holder',
): string {
  if (!userDetails?.firstName && !userDetails?.lastName) {
    return fallback;
  }

  return [userDetails.firstName, userDetails.lastName]
    .filter(Boolean)
    .join(' ');
}
