import {
  AsYouType,
  CountryCode,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';

export const formatPhoneNumber = (text: string, countryCode: CountryCode) => {
  const formatter = new AsYouType('US');
  const callingCode = getCountryCallingCode('US');
  const maxLength = 10;

  if (text.length === 0) {
    return {
      formatted: '',
      nationalNumber: '',
      isComplete: false,
      e164Format: `+${callingCode}`,
    };
  }

  // do not allow users to start with calling code
  if (text[0] === callingCode) {
    text = text.slice(callingCode.length);
  }

  // special "(" formatting for US numbers
  if (text.length === 1 && callingCode === '1') {
    return {
      formatted: `(${text}`,
      nationalNumber: text,
      isComplete: false,
      e164Format: '',
    };
  }

  if (text.length > maxLength) {
    text = text.slice(0, maxLength);
  }

  const formatted = formatter.input(text);

  return {
    formatted,
    nationalNumber: text,
    isComplete: text.length === maxLength,
    e164Format: `+${callingCode}${text}`,
  };
};

const emailRegex =
  /^[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

export const validateEmail = function (email: string) {
  if (!email || email.split('@').length !== 2) return false;
  return emailRegex.test(email);
};

export const formatUSPhoneNumber = (text: string) => {
  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) {
    return `(${cleaned}`;
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  }
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
    6,
    10,
  )}`;
};
