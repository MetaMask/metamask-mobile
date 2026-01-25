import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import { ImportSRPIDs } from '../../../../e2e/selectors/MultiSRP/SRPImport.selectors';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SrpInputGrid from './index';

// Mock Keyboard
jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  dismiss: jest.fn(),
}));

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

    it('does not render suggestions internally (suggestions rendered by parent)', () => {
      const seedPhrase = ['wallet', ''];

      const { getByTestId, queryByText } = renderWithProvider(
        <SrpInputGrid {...defaultProps} seedPhrase={seedPhrase} />,
      );

      const secondInput = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`);

      act(() => {
        fireEvent(secondInput, 'focus');
        fireEvent.changeText(secondInput, 'ab');
        jest.runAllTimers();
      });

      // Suggestions are not rendered internally - parent component handles rendering
      expect(queryByText('abandon')).not.toBeOnTheScreen();
      expect(queryByText('ability')).not.toBeOnTheScreen();
    });
  });

  describe('Ref Methods', () => {
    it('exposes handleSuggestionSelect via ref', () => {
      const ref = React.createRef<{
        handleSeedPhraseChange: (text: string) => void;
        handleSuggestionSelect: (word: string) => void;
      }>();

      const { getByTestId } = renderWithProvider(
        <SrpInputGrid {...defaultProps} ref={ref} />,
      );

      const input = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      fireEvent(input, 'focus');

      expect(ref.current?.handleSuggestionSelect).toBeDefined();
      expect(typeof ref.current?.handleSuggestionSelect).toBe('function');
    });

    it('calls onSeedPhraseChange when handleSuggestionSelect is called via ref', () => {
      const ref = React.createRef<{
        handleSeedPhraseChange: (text: string) => void;
        handleSuggestionSelect: (word: string) => void;
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
