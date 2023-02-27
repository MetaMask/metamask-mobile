const INCORRECT_SECRET_RECOVERY_PHRASE =
  'fold media south add since false relax immense pause cloth just falcon';
const CORRECT_SECRET_RECOVERY_PHRASE =
  'fold media south add since false relax immense pause cloth just raven';
const CORRECT_PASSWORD = `12345678`;
const SHORT_PASSWORD = `1234567`;
const INCORRECT_PASSWORD = `12345679`;

class Accounts {
  static getValidAccount() {
    return {
      seedPhrase: process.env.WALLET_KEYS,
      password: CORRECT_PASSWORD,
    };
  }

  static getInvalidAccount() {
    return {
      seedPhrase: INCORRECT_SECRET_RECOVERY_PHRASE,
      password: INCORRECT_PASSWORD,
    };
  }

  static getShortPasswordAccount() {
    return {
      seedPhrase: process.env.WALLET_KEYS,
      password: SHORT_PASSWORD,
    };
  }
}

export default Accounts;
