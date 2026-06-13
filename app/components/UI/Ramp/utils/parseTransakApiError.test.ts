import {
  extractRegisteredEmailFromTransakError,
  isTransakPhoneRegisteredError,
  parseTransakApiError,
} from './parseTransakApiError';

describe('parseTransakApiError', () => {
  it('reads errorCode and apiMessage from TransakApiError-shaped errors', () => {
    expect(
      parseTransakApiError({
        errorCode: '2020',
        apiMessage:
          'This phone number is already registered. It has been used by an account created with k****@pedalsup.com.',
      }),
    ).toEqual({
      errorCode: '2020',
      message:
        'This phone number is already registered. It has been used by an account created with k****@pedalsup.com.',
    });
  });

  it('reads errorCode and message from Axios-style errors', () => {
    expect(
      parseTransakApiError({
        response: {
          data: {
            error: {
              errorCode: 2020,
              message: 'Phone registered with t***@test.com',
            },
          },
        },
      }),
    ).toEqual({
      errorCode: 2020,
      message: 'Phone registered with t***@test.com',
    });
  });
});

describe('isTransakPhoneRegisteredError', () => {
  it('returns true for numeric and string Transak error codes', () => {
    expect(isTransakPhoneRegisteredError({ errorCode: 2020 })).toBe(true);
    expect(isTransakPhoneRegisteredError({ errorCode: '2020' })).toBe(true);
  });

  it('returns false for other Transak error codes', () => {
    expect(isTransakPhoneRegisteredError({ errorCode: '5000' })).toBe(false);
  });
});

describe('extractRegisteredEmailFromTransakError', () => {
  it('extracts masked email from apiMessage', () => {
    expect(
      extractRegisteredEmailFromTransakError({
        errorCode: '2020',
        apiMessage:
          'This phone number is already registered. It has been used by an account created with k****@pedalsup.com.',
      }),
    ).toBe('k****@pedalsup.com');
  });
});
