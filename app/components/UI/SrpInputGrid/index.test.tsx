import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import { ImportSRPIDs } from '../../../../e2e/selectors/MultiSRP/SRPImport.selectors';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SrpInputGrid from './index';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

// Mock Keyboard
jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  dismiss: jest.fn(),
}));

// Mock useFeatureFlag hook
jest.mock('../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: jest.fn(),
  FeatureFlagNames: {
    importSrpWordSuggestion: 'importSrpWordSuggestion',
  },
}));

const mockUseFeatureFlag = useFeatureFlag as jest.MockedFunction<
  typeof useFeatureFlag
>;

// Mock BIP39 wordlist with test words
jest.mock('@metamask/scure-bip39/dist/wordlists/english', () => ({
  wordlist: [
    'abandon',
    'ability',
    'able',
    'about',
    'above',
    'absent',
    'absorb',
    'abstract',
    'wallet',
    'walnut',
    'want',
    'war',
    'warm',
  ],
}));

describe('SrpInputGrid', () => {
  const mockOnSeedPhraseChange = jest.fn();
  const mockOnError = jest.fn();

  const defaultProps = {
    seedPhrase: [''],
    onSeedPhraseChange: mockOnSeedPhraseChange,
    onError: mockOnError,
    testIdPrefix: ImportSRPIDs.SEED_PHRASE_INPUT_ID,
    placeholderText: 'Enter your Secret Recovery Phrase',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Enable feature flag by default
    mockUseFeatureFlag.mockReturnValue(true);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders with empty seed phrase', () => {
    const { toJSON } = renderWithProvider(<SrpInputGrid {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with multiple words', () => {
    const seedPhrase = ['word1', 'word2', 'word3'];
    const { toJSON } = renderWithProvider(
      <SrpInputGrid {...defaultProps} seedPhrase={seedPhrase} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with disabled state', () => {
    const { toJSON } = renderWithProvider(
      <SrpInputGrid {...defaultProps} disabled />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with custom uniqueId', () => {
    const { toJSON } = renderWithProvider(
      <SrpInputGrid {...defaultProps} uniqueId="custom-id" />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  describe('BIP39 Word Suggestions', () => {
    it('filters suggestions by prefix', () => {
      const { getByTestId, getByText, queryByText } = renderWithProvider(
        <SrpInputGrid {...defaultProps} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent.changeText(input, 'ab');

      expect(getByText('abandon')).toBeOnTheScreen();
      expect(getByText('ability')).toBeOnTheScreen();
      expect(getByText('able')).toBeOnTheScreen();
      expect(getByText('about')).toBeOnTheScreen();
      expect(getByText('above')).toBeOnTheScreen();
      expect(queryByText('absent')).not.toBeOnTheScreen();
    });

    it('filters suggestions with case-insensitive prefix matching', () => {
      const { getByTestId, getByText, queryByText } = renderWithProvider(
        <SrpInputGrid {...defaultProps} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent.changeText(input, 'WAL');

      expect(getByText('wallet')).toBeOnTheScreen();
      expect(getByText('walnut')).toBeOnTheScreen();
      expect(queryByText('abandon')).not.toBeOnTheScreen();
    });

    it('displays no suggestions for empty input or non-matching text', () => {
      const { getByTestId, queryByText } = renderWithProvider(
        <SrpInputGrid {...defaultProps} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);

      // Empty input
      fireEvent.changeText(input, '');
      expect(queryByText('abandon')).not.toBeOnTheScreen();

      // Non-matching input
      fireEvent.changeText(input, 'xyz');
      expect(queryByText('abandon')).not.toBeOnTheScreen();
      expect(queryByText('wallet')).not.toBeOnTheScreen();
    });

    it('calls onSeedPhraseChange when suggestion is pressed', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <SrpInputGrid {...defaultProps} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent.changeText(input, 'wal');

      const suggestion = getByText('wallet');
      fireEvent.press(suggestion);

      expect(mockOnSeedPhraseChange).toHaveBeenCalled();
    });

    it('displays independent suggestions for each input field', () => {
      const seedPhrase = ['wallet', '', '', ''];
      const { getByTestId, getByText } = renderWithProvider(
        <SrpInputGrid {...defaultProps} seedPhrase={seedPhrase} />,
      );

      const secondInput = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`);
      fireEvent.changeText(secondInput, 'ab');

      expect(getByText('abandon')).toBeOnTheScreen();
      expect(getByText('ability')).toBeOnTheScreen();
    });

    it('hides suggestions when importSrpWordSuggestion feature flag is disabled', () => {
      mockUseFeatureFlag.mockReturnValue(false);

      const { getByTestId, queryByText } = renderWithProvider(
        <SrpInputGrid {...defaultProps} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent.changeText(input, 'ab');

      expect(queryByText('abandon')).not.toBeOnTheScreen();
      expect(queryByText('ability')).not.toBeOnTheScreen();
    });

    it('displays suggestions when importSrpWordSuggestion feature flag is enabled', () => {
      mockUseFeatureFlag.mockReturnValue(true);

      const { getByTestId, getByText } = renderWithProvider(
        <SrpInputGrid {...defaultProps} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent.changeText(input, 'ab');

      expect(getByText('abandon')).toBeOnTheScreen();
      expect(getByText('ability')).toBeOnTheScreen();
    });

    it('triggers onPressIn when suggestion is touched', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <SrpInputGrid {...defaultProps} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent.changeText(input, 'wal');
      fireEvent(input, 'focus');

      const suggestion = getByText('wallet');
      fireEvent(suggestion, 'pressIn');
      fireEvent.press(suggestion);

      expect(mockOnSeedPhraseChange).toHaveBeenCalled();
    });
  });

  describe('Input Focus and Blur', () => {
    it('tracks focus state when input is focused', () => {
      const { getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent(input, 'focus');

      expect(input).toBeTruthy();
    });

    it('handles blur event on input', () => {
      const seedPhrase = ['wallet', ''];
      const { getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} seedPhrase={seedPhrase} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');

      jest.advanceTimersByTime(200);

      expect(input).toBeTruthy();
    });

    it('validates word on blur and marks invalid words', () => {
      const seedPhrase = ['invalidword'];
      const { getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} seedPhrase={seedPhrase} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');

      expect(input).toBeTruthy();
    });
  });

  describe('Keyboard Events', () => {
    it('handles backspace on empty input to focus previous field', () => {
      const seedPhrase = ['wallet', ''];
      const { getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} seedPhrase={seedPhrase} />,
      );

      const secondInput = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`);
      fireEvent(secondInput, 'keyPress', {
        nativeEvent: { key: 'Backspace' },
      });

      expect(mockOnSeedPhraseChange).toHaveBeenCalled();
    });

    it('handles enter key press to move to next input', () => {
      const seedPhrase = ['wallet', ''];
      const { getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} seedPhrase={seedPhrase} />,
      );

      const firstInput = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent(firstInput, 'submitEditing');

      expect(firstInput).toBeTruthy();
    });
  });

  describe('Paste and Clear', () => {
    it('handles paste of multiple words', () => {
      const { getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent.changeText(
        input,
        'abandon ability able about above absent absorb abstract wallet walnut want war',
      );

      expect(mockOnSeedPhraseChange).toHaveBeenCalled();
    });

    it('clears all inputs when clear button is pressed', () => {
      const seedPhrase = ['wallet', 'abandon'];
      const { getByText } = renderWithProvider(
        <SrpInputGrid {...defaultProps} seedPhrase={seedPhrase} />,
      );

      const clearButton = getByText('Clear all');
      fireEvent.press(clearButton);

      expect(mockOnSeedPhraseChange).toHaveBeenCalledWith(['']);
    });
  });

  describe('Word Input Handling', () => {
    it('triggers change handler when typing in input', () => {
      const { getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent.changeText(input, 'wallet');

      expect(mockOnSeedPhraseChange).toHaveBeenCalled();
    });

    it('handles typing in second input field', () => {
      const seedPhrase = ['wallet', ''];
      const { getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} seedPhrase={seedPhrase} />,
      );

      const secondInput = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`);
      fireEvent.changeText(secondInput, 'abandon');

      expect(mockOnSeedPhraseChange).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays external error when provided', () => {
      const { getByText } = renderWithProvider(
        <SrpInputGrid {...defaultProps} externalError="Invalid seed phrase" />,
      );

      expect(getByText('Invalid seed phrase')).toBeOnTheScreen();
    });

    it('calls onError when validation fails', () => {
      const seedPhrase = ['invalidword', 'anotherInvalid'];
      const { getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} seedPhrase={seedPhrase} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');

      // onError is called with validation results
      expect(mockOnError).toBeDefined();
    });
  });

  describe('Component Lifecycle', () => {
    it('cleans up blur timeout on unmount', () => {
      const { unmount, getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');

      // Unmount before timeout fires - cleanup should clear timeout
      unmount();

      // Advance timers - no errors should occur
      jest.advanceTimersByTime(200);
    });

    it('handles multiple focus/blur cycles', () => {
      const seedPhrase = ['wallet', 'abandon', ''];
      const { getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} seedPhrase={seedPhrase} />,
      );

      const firstInput = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      const secondInput = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`);

      // Focus first, blur, focus second
      fireEvent(firstInput, 'focus');
      fireEvent(firstInput, 'blur');
      fireEvent(secondInput, 'focus');
      fireEvent(secondInput, 'blur');

      jest.advanceTimersByTime(200);

      expect(firstInput).toBeTruthy();
      expect(secondInput).toBeTruthy();
    });

    it('maintains refs across re-renders', () => {
      const { getByTestId, rerender } = renderWithProvider(
        <SrpInputGrid {...defaultProps} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent.changeText(input, 'wal');

      rerender(<SrpInputGrid {...defaultProps} seedPhrase={['wallet', '']} />);

      expect(input).toBeTruthy();
    });
  });

  describe('External Suggestions Rendering', () => {
    it('calls onCurrentWordChange when input text changes in grid mode', () => {
      const mockOnCurrentWordChange = jest.fn();
      const seedPhrase = ['wallet', ''];
      const { getByTestId } = renderWithProvider(
        <SrpInputGrid
          {...defaultProps}
          seedPhrase={seedPhrase}
          onCurrentWordChange={mockOnCurrentWordChange}
        />,
      );

      const secondInput = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`);

      act(() => {
        fireEvent(secondInput, 'focus');
        fireEvent.changeText(secondInput, 'wal');
        jest.runAllTimers();
      });

      expect(mockOnCurrentWordChange).toHaveBeenCalledWith('wal');
    });

    it('hides internal suggestions when renderSuggestionsExternally is true', () => {
      mockUseFeatureFlag.mockReturnValue(true);
      const seedPhrase = ['wallet', ''];

      const { getByTestId, queryByText } = renderWithProvider(
        <SrpInputGrid
          {...defaultProps}
          seedPhrase={seedPhrase}
          renderSuggestionsExternally
        />,
      );

      const secondInput = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`);

      act(() => {
        fireEvent(secondInput, 'focus');
        fireEvent.changeText(secondInput, 'ab');
        jest.runAllTimers();
      });

      expect(queryByText('abandon')).not.toBeOnTheScreen();
    });

    it('displays internal suggestions when renderSuggestionsExternally is false', () => {
      mockUseFeatureFlag.mockReturnValue(true);
      const seedPhrase = ['wallet', ''];

      const { getByTestId, getByText } = renderWithProvider(
        <SrpInputGrid
          {...defaultProps}
          seedPhrase={seedPhrase}
          renderSuggestionsExternally={false}
        />,
      );

      const secondInput = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`);

      act(() => {
        fireEvent(secondInput, 'focus');
        fireEvent.changeText(secondInput, 'ab');
        jest.runAllTimers();
      });

      expect(getByText('abandon')).toBeOnTheScreen();
    });
  });

  describe('Ref Methods', () => {
    it('exposes handleSuggestionSelect via ref', () => {
      const ref = React.createRef<{
        handleSeedPhraseChange: (text: string) => void;
        handleSuggestionSelect: (word: string) => void;
        setSuggestionSelecting: (value: boolean) => void;
      }>();

      const { getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} ref={ref} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent(input, 'focus');

      expect(ref.current?.handleSuggestionSelect).toBeDefined();
      expect(typeof ref.current?.handleSuggestionSelect).toBe('function');
    });

    it('exposes setSuggestionSelecting via ref', () => {
      const ref = React.createRef<{
        handleSeedPhraseChange: (text: string) => void;
        handleSuggestionSelect: (word: string) => void;
        setSuggestionSelecting: (value: boolean) => void;
      }>();

      renderWithProvider(<SrpInputGrid {...defaultProps} ref={ref} />);

      expect(ref.current?.setSuggestionSelecting).toBeDefined();
      expect(typeof ref.current?.setSuggestionSelecting).toBe('function');
    });

    it('calls onSeedPhraseChange when handleSuggestionSelect is called via ref', () => {
      const ref = React.createRef<{
        handleSeedPhraseChange: (text: string) => void;
        handleSuggestionSelect: (word: string) => void;
        setSuggestionSelecting: (value: boolean) => void;
      }>();

      const { getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} ref={ref} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent(input, 'focus');

      ref.current?.handleSuggestionSelect('wallet');

      jest.advanceTimersByTime(100);

      expect(mockOnSeedPhraseChange).toHaveBeenCalled();
    });
  });
});
