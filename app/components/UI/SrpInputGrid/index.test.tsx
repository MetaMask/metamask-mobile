import React from 'react';
import { ImportSRPIDs } from '../../../../e2e/selectors/MultiSRP/SRPImport.selectors';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SrpInputGrid from './index';

describe('SrpInputGrid', () => {
  const mockOnSeedPhraseChange = jest.fn();
  const mockOnError = jest.fn();
  const mockOnPaste = jest.fn();
  const mockOnClear = jest.fn();

  const defaultProps = {
    seedPhrase: [''],
    onSeedPhraseChange: mockOnSeedPhraseChange,
    onError: mockOnError,
    onPaste: mockOnPaste,
    onClear: mockOnClear,
    testIDPrefix: ImportSRPIDs.SEED_PHRASE_INPUT_ID,
    placeholderText: 'Enter your Secret Recovery Phrase',
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
});
