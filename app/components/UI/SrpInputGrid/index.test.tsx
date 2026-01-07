import React from 'react';
import { ImportSRPIDs } from '../../../../tests/selectors/MultiSRP/SRPImport.selectors';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SrpInputGrid from './index';

// Mock Keyboard
jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  dismiss: jest.fn(),
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
});
