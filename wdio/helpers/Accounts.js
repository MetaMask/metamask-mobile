// This is an incorrect BIP39 SRP. It uses words not in the BIP39 wordlist.
const INCORRECT_SECRET_RECOVERY_PHRASE =
  'gain lemon refuse sunny identify diesel hand endless first involve wink size';
const CORRECT_PASSWORD = `12345678`;
const SHORT_PASSWORD = `1234567`;

const INCORRECT_PASSWORD = `12345679`;

//TODO refactor as a class with instance methods and instead of static methods
class Accounts {
  static getValidAccount(env) {
    console.log(
      'MM_TEST_ACCOUNT_SRP:',
      env.MM_TEST_ACCOUNT_SRP ? 'OK Defined' : env.MM_TEST_ACCOUNT_SRP,
    );
    return {
      // A correct BIP39 SRP that can be used for testing. Requires the var to be set in the environment.
      seedPhrase: env.MM_TEST_ACCOUNT_SRP || 'undefined SRP env var',
      // Ethereum address for 1st account of derived on the seed that can be used for testing. Requires the var to be set in the environment.
      address: env.MM_TEST_ACCOUNT_ADDRESS || 'undefined address env var',
      password: CORRECT_PASSWORD,
    };
  }

  static getInvalidAccount() {
    return {
      seedPhrase: INCORRECT_SECRET_RECOVERY_PHRASE,
      password: INCORRECT_PASSWORD,
    };
  }

  static getAccountPrivateKey(env) {
    return {
      keys: env.MM_TEST_ACCOUNT_PRIVATE_KEY || 'undefined Private key env var',
    };
  }

  static getShortPasswordAccount(env) {
    const account = Accounts.getValidAccount(env);
    account.password = SHORT_PASSWORD;
    return account;
  }
}

export default Accounts;
