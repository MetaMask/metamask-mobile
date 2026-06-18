/** Shared Transak native KYC form field types (UB2 NativeFlow). */

export interface BasicInfoFormData {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  dob: string;
  ssn?: string;
}

export interface AddressFormData {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postCode: string;
  countryCode: string;
}
