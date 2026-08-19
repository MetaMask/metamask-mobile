// This is an incorrect BIP39 SRP. It uses words not in the BIP39 wordlist.
const INCORRECT_SECRET_RECOVERY_PHRASE =
  'gain lemon refuse sunny identify diesel hand endless first involve wink size';
const CORRECT_PASSWORD = '12345678';
const SHORT_PASSWORD = '1234567';
const INCORRECT_PASSWORD = '12345679';

interface ValidAccount {
  seedPhrase: string;
  address: string;
  password: string;
}

interface InvalidAccount {
  seedPhrase: string;
  password: string;
}

interface AccountPrivateKey {
  keys: string;
}

class Accounts {
  static getValidAccount(): ValidAccount {
    return {
      // A correct BIP39 SRP that can be used for testing. Requires the var to be set in the environment.
      seedPhrase: process.env.MM_TEST_ACCOUNT_SRP ?? 'undefined SRP env var',
      // Ethereum address for 1st account derived on the seed that can be used for testing. Requires the var to be set in the environment.
      address:
        process.env.MM_TEST_ACCOUNT_ADDRESS ?? 'undefined address env var',
      password: CORRECT_PASSWORD,
    };
  }

  static getInvalidAccount(): InvalidAccount {
    return {
      seedPhrase: INCORRECT_SECRET_RECOVERY_PHRASE,
      password: INCORRECT_PASSWORD,
    };
  }

  static getAccountPrivateKey(): AccountPrivateKey {
    return {
      keys:
        process.env.MM_TEST_ACCOUNT_PRIVATE_KEY ??
        'undefined Private key env var',
    };
  }

  static getShortPasswordAccount(): ValidAccount {
    return {
      ...Accounts.getValidAccount(),
      password: SHORT_PASSWORD,
    };
  }
}

export default Accounts;
export type { ValidAccount, InvalidAccount, AccountPrivateKey };
