import React from 'react';
import { render } from '@testing-library/react-native';
import EarnTransactionMonitor from './EarnTransactionMonitor';
import { useMusdConversionStatus } from '../hooks/useMusdConversionStatus';
import { useMerklClaimStatus } from '../hooks/useMerklClaimStatus';

jest.mock('../hooks/useMusdConversionStatus');
jest.mock('../hooks/useMerklClaimStatus');

describe('EarnTransactionMonitor', () => {
  const mockUseMusdConversionStatus = jest.mocked(useMusdConversionStatus);
  const mockUseMerklClaimStatus = jest.mocked(useMerklClaimStatus);

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

  it('calls useMerklClaimStatus hook', () => {
    render(<EarnTransactionMonitor />);

    expect(mockUseMerklClaimStatus).toHaveBeenCalledTimes(1);
  });

  it('returns null', () => {
    const { toJSON } = render(<EarnTransactionMonitor />);

    expect(toJSON()).toBeNull();
  });
});
