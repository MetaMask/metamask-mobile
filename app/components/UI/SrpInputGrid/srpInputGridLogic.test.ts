import { Keyboard } from 'react-native';
import { applySeedPhraseChangeAtIndex } from './srpInputGridLogic';

jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => {
  const keyboard = {
    dismiss: jest.fn(),
  };
  return { __esModule: true, default: keyboard, ...keyboard };
});

describe('applySeedPhraseChangeAtIndex', () => {
  const onSeedPhraseChange = jest.fn();
  const onCurrentWordChange = jest.fn();
  const setErrorWordIndexes = jest.fn();
  const setNextSeedPhraseInputFocusedIndex = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('appends an empty input after space when the first 12 words are a valid mnemonic', () => {
    // First 12 words of a 24-word SRP that are independently BIP39-valid.
    const twelveValidPrefix =
      'tumble heart quit undo right legal salute lizard tape unveil art lava';
    const seedPhrase = twelveValidPrefix.split(' ');

    applySeedPhraseChangeAtIndex({
      seedPhrase,
      seedPhraseText: 'lava ',
      index: 11,
      onSeedPhraseChange,
      onCurrentWordChange,
      setErrorWordIndexes,
      setNextSeedPhraseInputFocusedIndex,
    });

    expect(onSeedPhraseChange).toHaveBeenCalledWith([...seedPhrase, '']);
    expect(Keyboard.dismiss).not.toHaveBeenCalled();
    expect(setNextSeedPhraseInputFocusedIndex).toHaveBeenCalledWith(12);
  });

  it('does not append an empty input after space once 24 words are entered', () => {
    const twentyFourWords =
      'tumble heart quit undo right legal salute lizard tape unveil art lava filter fee snack fragile duck impact oven come cram tourist casino sort';
    const seedPhrase = twentyFourWords.split(' ');

    applySeedPhraseChangeAtIndex({
      seedPhrase,
      seedPhraseText: 'sort ',
      index: 23,
      onSeedPhraseChange,
      onCurrentWordChange,
      setErrorWordIndexes,
      setNextSeedPhraseInputFocusedIndex,
    });

    expect(onSeedPhraseChange).toHaveBeenCalledWith(seedPhrase);
    expect(Keyboard.dismiss).toHaveBeenCalled();
    expect(setNextSeedPhraseInputFocusedIndex).toHaveBeenCalledWith(null);
  });
});
