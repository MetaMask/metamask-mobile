export const MONEY_SMS_DEMO_PHONE_NUMBER = '+15555550182';

export const getMoneySmsLocalDigits = (value: string) => {
  const digits = value.replace(/\D/g, '');
  const includesCountryCode =
    /^\s*\+1/.test(value) || (digits.length > 10 && digits.startsWith('1'));
  return (includesCountryCode ? digits.slice(1) : digits).slice(0, 10);
};

export const formatMoneySmsPhoneNumber = (value: string) => {
  const digits = getMoneySmsLocalDigits(value);
  if (!digits) {
    return '';
  }

  const areaCode = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const lineNumber = digits.slice(6, 10);

  if (digits.length <= 3) {
    return `+1 (${areaCode}`;
  }
  if (digits.length <= 6) {
    return `+1 (${areaCode}) ${prefix}`;
  }
  return `+1 (${areaCode}) ${prefix}-${lineNumber}`;
};

export const maskMoneySmsPhoneNumber = (value: string) => {
  const digits = getMoneySmsLocalDigits(value);
  return `+1 ••• ••• ${digits.slice(-4).padStart(4, '•')}`;
};
