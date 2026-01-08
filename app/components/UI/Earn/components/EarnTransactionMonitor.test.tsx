import React from 'react';
import { render } from '@testing-library/react-native';
import EarnTransactionMonitor from './EarnTransactionMonitor';
import { useEarnLendingTransactionStatus } from '../hooks/useEarnLendingTransactionStatus';
import { useMusdConversionStatus } from '../hooks/useMusdConversionStatus';

jest.mock('../hooks/useMusdConversionStatus');
jest.mock('../hooks/useEarnLendingTransactionStatus');

describe('EarnTransactionMonitor', () => {
  const mockUseMusdConversionStatus = jest.mocked(useMusdConversionStatus);
  const mockUseEarnLendingTransactionStatus = jest.mocked(
    useEarnLendingTransactionStatus,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders without crashing', () => {
    const result = render(<EarnTransactionMonitor />);

    expect(result).toBeDefined();
  });

  it('calls useMusdConversionStatus hook', () => {
    render(<EarnTransactionMonitor />);

    expect(mockUseMusdConversionStatus).toHaveBeenCalledTimes(1);
  });

  it('calls useEarnLendingTransactionStatus hook', () => {
    render(<EarnTransactionMonitor />);

    expect(mockUseEarnLendingTransactionStatus).toHaveBeenCalledTimes(1);
  });

  it('returns null', () => {
    const { toJSON } = render(<EarnTransactionMonitor />);

    expect(toJSON()).toBeNull();
  });
});
