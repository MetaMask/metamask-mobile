import React from 'react';
import { fireEvent } from '@testing-library/react-native';
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
  });
});
