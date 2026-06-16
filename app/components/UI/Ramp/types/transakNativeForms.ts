/** Shared Transak native KYC form field types (UB2 NativeFlow). */

export type BasicInfoFormData = {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  dob: string;
  ssn?: string;
};

export type AddressFormData = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postCode: string;
  countryCode: string;
};
