import React from 'react';
import { ImportSRPIDs } from '../../../../e2e/selectors/MultiSRP/SRPImport.selectors';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SrpInputGrid from './index';

describe('SrpInputGrid', () => {
  const mockOnSeedPhraseChange = jest.fn();
  const mockOnFocusChange = jest.fn();
  const mockOnNextFocusChange = jest.fn();
  const mockOnPaste = jest.fn();
  const mockOnClear = jest.fn();
  const mockSeedPhraseInputRefs = { current: new Map() };

  const defaultProps = {
    seedPhrase: [''],
    seedPhraseInputFocusedIndex: null,
    nextSeedPhraseInputFocusedIndex: null,
    errorWordIndexes: {},
    onSeedPhraseChange: mockOnSeedPhraseChange,
    onFocusChange: mockOnFocusChange,
    onNextFocusChange: mockOnNextFocusChange,
    onPaste: mockOnPaste,
    onClear: mockOnClear,
    seedPhraseInputRefs: mockSeedPhraseInputRefs,
    testIDPrefix: ImportSRPIDs.SEED_PHRASE_INPUT_ID,
    placeholderText: 'Enter your Secret Recovery Phrase',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with empty seed phrase', () => {
    const { toJSON } = renderWithProvider(<SrpInputGrid {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with multiple words', () => {
    const seedPhrase = ['word1', 'word2', 'word3'];
    const { toJSON } = renderWithProvider(
      <SrpInputGrid {...defaultProps} seedPhrase={seedPhrase} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with error message', () => {
    const { toJSON } = renderWithProvider(
      <SrpInputGrid {...defaultProps} error="Invalid seed phrase" />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with disabled state', () => {
    const { toJSON } = renderWithProvider(
      <SrpInputGrid {...defaultProps} disabled />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with custom uniqueId', () => {
    const { toJSON } = renderWithProvider(
      <SrpInputGrid {...defaultProps} uniqueId="custom-id" />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
