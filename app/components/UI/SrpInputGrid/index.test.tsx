import React from 'react';
import { ImportSRPIDs } from '../../../../e2e/selectors/MultiSRP/SRPImport.selectors';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SrpInputGrid from './index';

// Mock Keyboard
jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  dismiss: jest.fn(),
}));

describe('SrpInputGrid', () => {
  const mockOnSeedPhraseChange = jest.fn();
  const mockOnError = jest.fn();
  const mockOnExternalSeedPhraseProcessed = jest.fn();

  const defaultProps = {
    seedPhrase: [''],
    onSeedPhraseChange: mockOnSeedPhraseChange,
    onError: mockOnError,
    externalSeedPhrase: null,
    onExternalSeedPhraseProcessed: mockOnExternalSeedPhraseProcessed,
    testIDPrefix: ImportSRPIDs.SEED_PHRASE_INPUT_ID,
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

  it('processes external seed phrase when provided', () => {
    const externalSeedPhrase = 'word1 word2 word3';

    renderWithProvider(
      <SrpInputGrid
        {...defaultProps}
        externalSeedPhrase={externalSeedPhrase}
      />,
    );

    // Fast-forward timers to allow setTimeout to complete
    jest.runAllTimers();

    expect(mockOnExternalSeedPhraseProcessed).toHaveBeenCalled();
  });

  it('does not process when external seed phrase is empty', () => {
    renderWithProvider(
      <SrpInputGrid {...defaultProps} externalSeedPhrase="" />,
    );

    expect(mockOnExternalSeedPhraseProcessed).not.toHaveBeenCalled();
  });

  it('does not process when external seed phrase is null', () => {
    renderWithProvider(
      <SrpInputGrid {...defaultProps} externalSeedPhrase={null} />,
    );

    expect(mockOnExternalSeedPhraseProcessed).not.toHaveBeenCalled();
  });
});
