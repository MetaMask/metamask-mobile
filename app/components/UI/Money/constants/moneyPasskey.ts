export type MoneyPasskeyMethod = 'one_password' | 'passwords' | 'icloud';

export interface MoneyPasskeyRecord {
  name: string;
  method: MoneyPasskeyMethod;
  createdAt?: Date;
}

export const MONEY_PASSKEY_METHOD_NAMES: Record<MoneyPasskeyMethod, string> = {
  one_password: '1Password',
  passwords: 'Passwords',
  icloud: 'iCloud Keychain',
};

export const MONEY_PASSKEY_METHOD_CODES: Record<MoneyPasskeyMethod, number> = {
  one_password: 1,
  passwords: 2,
  icloud: 3,
};

export const getMoneyPasskeyMethodFromCode = (
  code: number,
): MoneyPasskeyMethod => {
  const entry = Object.entries(MONEY_PASSKEY_METHOD_CODES).find(
    ([, methodCode]) => methodCode === code,
  );

  return (entry?.[0] as MoneyPasskeyMethod | undefined) ?? 'one_password';
};
