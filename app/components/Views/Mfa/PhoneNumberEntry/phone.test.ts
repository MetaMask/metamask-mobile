import {
  PHONE_COUNTRIES,
  formatNational,
  getCountryFlag,
  getCountryName,
  getDialPrefix,
  getInitialPhone,
  getPhoneCountry,
  isValidNational,
  normalizeNational,
  parsePhoneInput,
  toPhoneNumberValue,
} from './phone';

const US = getPhoneCountry('US');
const CA = getPhoneCountry('CA');
const GB = getPhoneCountry('GB');
const FR = getPhoneCountry('FR');

describe('formatNational', () => {
  it('formats as the user types, adding separators only before a digit', () => {
    expect(formatNational('', US)).toBe('');
    expect(formatNational('4', US)).toBe('(4');
    expect(formatNational('415', US)).toBe('(415');
    expect(formatNational('4155', US)).toBe('(415) 5');
    expect(formatNational('4155552671', US)).toBe('(415) 555-2671');
  });

  it('uses the country template and keeps digits past it', () => {
    expect(formatNational('7911123456', GB)).toBe('7911 123456');
    expect(formatNational('612345678', FR)).toBe('6 12 34 56 78');
  });
});

describe('PHONE_COUNTRIES', () => {
  it('has a template that holds the longest number of each country', () => {
    PHONE_COUNTRIES.forEach((country) => {
      const slots = (country.template.match(/X/gu) ?? []).length;
      expect(slots).toBeGreaterThanOrEqual(country.maxDigits);
    });
  });
});

describe('normalizeNational', () => {
  it('keeps digits only and caps the length', () => {
    expect(normalizeNational('(415) 555-2671 ext 9', US)).toBe('4155552671');
  });

  it('drops a leading 1 from a long North American number', () => {
    expect(normalizeNational('1 415 555 2671', US)).toBe('4155552671');
    expect(normalizeNational('1415', US)).toBe('1415');
  });

  it('drops the dial-out zero of countries that use one', () => {
    expect(normalizeNational('07911 123456', GB)).toBe('7911123456');
    expect(normalizeNational('0612345678', getPhoneCountry('IT'))).toBe(
      '0612345678',
    );
  });
});

describe('isValidNational', () => {
  it('checks the North American numbering plan', () => {
    expect(isValidNational('4155552671', US)).toBe(true);
    expect(isValidNational('4155552671', CA)).toBe(true);
    expect(isValidNational('415555267', US)).toBe(false);
    expect(isValidNational('1155552671', US)).toBe(false);
    expect(isValidNational('4151552671', US)).toBe(false);
  });

  it('checks the length range of other countries', () => {
    expect(isValidNational('7911123456', GB)).toBe(true);
    expect(isValidNational('791112345', GB)).toBe(false);
    expect(isValidNational('', GB)).toBe(false);
  });
});

describe('toPhoneNumberValue', () => {
  it('builds the E.164 number, the country and the national digits', () => {
    expect(toPhoneNumberValue('4155552671', US)).toStrictEqual({
      e164: '+14155552671',
      country: 'US',
      national: '4155552671',
    });
    expect(toPhoneNumberValue('7911123456', GB)).toStrictEqual({
      e164: '+447911123456',
      country: 'GB',
      national: '7911123456',
    });
  });
});

describe('parsePhoneInput', () => {
  it('reads plain text as the current country’s national number', () => {
    expect(parsePhoneInput('(415) 555-2671', US)).toStrictEqual({
      country: US,
      digits: '4155552671',
    });
  });

  it('selects the country of a pasted international number', () => {
    expect(parsePhoneInput('+44 7911 123456', US)).toStrictEqual({
      country: GB,
      digits: '7911123456',
    });
    expect(parsePhoneInput('tel:+33612345678', US)).toStrictEqual({
      country: FR,
      digits: '612345678',
    });
  });

  it('keeps a shared calling code in the current country', () => {
    expect(parsePhoneInput('+14155552671', CA).country).toBe(CA);
    expect(parsePhoneInput('+14155552671', US).country).toBe(US);
  });

  it('keeps the current country for an unknown calling code', () => {
    expect(parsePhoneInput('+999123', US).country).toBe(US);
  });
});

describe('getInitialPhone', () => {
  it('starts in the default country, US unless told otherwise', () => {
    expect(getInitialPhone(undefined)).toStrictEqual({
      country: US,
      digits: '',
    });
    expect(getInitialPhone('', 'gb').country).toBe(GB);
  });

  it('reads an E.164 or national initial value', () => {
    expect(getInitialPhone('+447911123456').country).toBe(GB);
    expect(getInitialPhone('4155552671', 'US').digits).toBe('4155552671');
  });

  it('falls back to the first country for an unknown code', () => {
    expect(getPhoneCountry('ZZ')).toBe(US);
  });
});

describe('getCountryFlag', () => {
  it('builds the flag from the country code', () => {
    expect(getCountryFlag('US')).toBe('🇺🇸');
  });
});

describe('getCountryName', () => {
  it('gives the English name without relying on Intl.DisplayNames', () => {
    expect(getCountryName('US')).toBe('United States of America');
    expect(getCountryName('gb')).toBe('United Kingdom');
    expect(getCountryName('ZZ')).toBe('ZZ');
  });
});

describe('the rest of the world', () => {
  it('has unique country codes and numeric calling codes', () => {
    const isos = PHONE_COUNTRIES.map((country) => country.iso);
    expect(new Set(isos).size).toBe(isos.length);
    PHONE_COUNTRIES.forEach((country) => {
      expect(country.callingCode).toMatch(/^[1-9]\d{0,2}$/u);
    });
  });

  it('checks the length of a country without detailed rules', () => {
    const israel = getPhoneCountry('IL');
    expect(isValidNational('501234567', israel)).toBe(true);
    expect(isValidNational('123', israel)).toBe(false);
    expect(isValidNational('1'.repeat(12), israel)).toBe(true);
    expect(isValidNational('1'.repeat(13), israel)).toBe(false);
  });

  it('formats a country without a detailed template', () => {
    expect(formatNational('501234567', getPhoneCountry('IL'))).toBe(
      '501 234 567',
    );
  });

  it('reads a North American territory by its area code', () => {
    const parsed = parsePhoneInput('+1 684 555 1234', getPhoneCountry('US'));
    expect(parsed.country.iso).toBe('AS');
    expect(parsed.digits).toBe('6845551234');
    expect(isValidNational(parsed.digits, parsed.country)).toBe(true);
    expect(toPhoneNumberValue(parsed.digits, parsed.country).e164).toBe(
      '+16845551234',
    );
  });

  it('accepts every area code of a territory, and no other', () => {
    const dominicanRepublic = getPhoneCountry('DO');
    ['8095551234', '8295551234', '8495551234'].forEach((digits) => {
      expect(isValidNational(digits, dominicanRepublic)).toBe(true);
    });
    expect(isValidNational('2125551234', dominicanRepublic)).toBe(false);
    expect(isValidNational('9395551234', getPhoneCountry('PR'))).toBe(true);
    expect(isValidNational('6585551234', getPhoneCountry('JM'))).toBe(true);
    expect(toPhoneNumberValue('8295551234', dominicanRepublic).e164).toBe(
      '+18295551234',
    );
  });

  it('shows the area codes of a territory beside its calling code', () => {
    expect(getDialPrefix(getPhoneCountry('GB'))).toBe('+44');
    expect(getDialPrefix(getPhoneCountry('US'))).toBe('+1');
    expect(getDialPrefix(getPhoneCountry('DO'))).toBe('+1 809, 829, 849');
  });

  it('keeps the current country when a calling code is shared', () => {
    expect(
      parsePhoneInput('+7 912 345 6789', getPhoneCountry('KZ')).country.iso,
    ).toBe('KZ');
    expect(
      parsePhoneInput('+7 912 345 6789', getPhoneCountry('US')).country.iso,
    ).toBe('RU');
  });
});
