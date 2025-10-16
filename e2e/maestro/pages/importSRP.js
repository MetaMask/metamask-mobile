// importSRP.js
// Page Object for Import Secret Recovery Phrase screen

/* global output */

output.importSRP = {
  // Screen Title
  screenTitle: 'Import Secret Recovery Phrase',

  // SRP Input Fields (12-word)
  word1: 'srp-input-word-1',
  word2: 'srp-input-word-2',
  word3: 'srp-input-word-3',
  word4: 'srp-input-word-4',
  word5: 'srp-input-word-5',
  word6: 'srp-input-word-6',
  word7: 'srp-input-word-7',
  word8: 'srp-input-word-8',
  word9: 'srp-input-word-9',
  word10: 'srp-input-word-10',
  word11: 'srp-input-word-11',
  word12: 'srp-input-word-12',

  // Action Button
  continueBtn: 'Continue',

  // Helper to get word input by index (1-12)
  getWordInput (index) {
    return `srp-input-word-${index}`;
  },
};
