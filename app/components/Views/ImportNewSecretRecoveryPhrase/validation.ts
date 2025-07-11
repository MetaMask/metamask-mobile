import { isValidMnemonic } from 'ethers/lib/utils';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { strings } from '../../../../locales/i18n';

const hasUpperCase = (draftSrp: string) => draftSrp !== draftSrp.toLowerCase();

export const validateSRP = (phrase: string[], words: boolean[]) => {
  if (!phrase.some((word) => word !== '')) {
    return { error: '', words };
  }

  const state = {
    error: '',
    words: phrase.map((word) => !wordlist.includes(word)),
  };

  return state;
};

export const validateCompleteness = (
  state: { error: string; words: boolean[] },
  phrase: string[],
) => {
  if (state.error) {
    return state;
  }
  if (phrase.some((word) => word === '')) {
    return {
      ...state,
      error: strings(
        'import_new_secret_recovery_phrase.error_number_of_words_error_message',
      ),
    };
  }
  return state;
};

export const validateCase = (
  state: { error: string; words: boolean[] },
  phrase: string,
) => {
  if (state.error) {
    return state;
  }
  if (hasUpperCase(phrase)) {
    return {
      ...state,
      error: strings(
        'import_new_secret_recovery_phrase.error_srp_is_case_sensitive',
      ),
    };
  }
  return state;
};

export const validateWords = (state: { error: string; words: boolean[] }) => {
  if (state.error) {
    return state;
  }

  const invalidWordIndices = state.words
    .map((invalid, index) => (invalid ? index + 1 : 0))
    .filter((index) => index !== 0);

  if (invalidWordIndices.length === 0) {
    return state;
  }
  if (invalidWordIndices.length === 1) {
    return {
      ...state,
      error: `${strings(
        'import_new_secret_recovery_phrase.error_srp_word_error_1',
      )}${invalidWordIndices[0]}${strings(
        'import_new_secret_recovery_phrase.error_srp_word_error_2',
      )}`,
    };
  }

  const lastIndex = invalidWordIndices.pop();
  const firstPart = invalidWordIndices.join(', ');
  return {
    ...state,
    error: `${strings(
      'import_new_secret_recovery_phrase.error_multiple_srp_word_error_1',
    )}${firstPart}${strings(
      'import_new_secret_recovery_phrase.error_multiple_srp_word_error_2',
    )}${lastIndex}${strings(
      'import_new_secret_recovery_phrase.error_multiple_srp_word_error_3',
    )}`,
  };
};

export const validateMnemonic = (
  state: { error: string; words: boolean[] },
  phrase: string,
) => {
  if (state.error) {
    return state;
  }
  if (!isValidMnemonic(phrase)) {
    return {
      ...state,
      error: strings('import_new_secret_recovery_phrase.error_invalid_srp'),
    };
  }
  return state;
};
