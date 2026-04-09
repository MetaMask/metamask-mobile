import React from 'react';
import { render } from '@testing-library/react-native';
import EarnTransactionMonitor from './EarnTransactionMonitor';
import { useMusdConversionStatus } from '../hooks/useMusdConversionStatus';
import { useMusdConversionStaleApprovalCleanup } from '../hooks/useMusdConversionStaleApprovalCleanup';
import { useMerklClaimStatus } from '../hooks/useMerklClaimStatus';
import { useEnsureMusdTokenRegistered } from '../hooks/useEnsureMusdTokenRegistered';

jest.mock('../hooks/useMusdConversionStatus');
jest.mock('../hooks/useMusdConversionStaleApprovalCleanup');
jest.mock('../hooks/useMerklClaimStatus');
jest.mock('../hooks/useEnsureMusdTokenRegistered');

describe('EarnTransactionMonitor', () => {
  const mockUseMusdConversionStatus = jest.mocked(useMusdConversionStatus);
  const mockUseMusdConversionStaleApprovalCleanup = jest.mocked(
    useMusdConversionStaleApprovalCleanup,
  );
  const mockUseMerklClaimStatus = jest.mocked(useMerklClaimStatus);
  const mockUseEnsureMusdTokenRegistered = jest.mocked(
    useEnsureMusdTokenRegistered,
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

  it('calls useMusdConversionStaleApprovalCleanup hook', () => {
    render(<EarnTransactionMonitor />);

    expect(mockUseMusdConversionStaleApprovalCleanup).toHaveBeenCalledTimes(1);
  });

  it('calls useMerklClaimStatus hook', () => {
    render(<EarnTransactionMonitor />);

    expect(mockUseMerklClaimStatus).toHaveBeenCalledTimes(1);
  });

  it('calls useEnsureMusdTokenRegistered hook', () => {
    render(<EarnTransactionMonitor />);

    expect(mockUseEnsureMusdTokenRegistered).toHaveBeenCalledTimes(1);
  });

  it('returns null', () => {
    const { toJSON } = render(<EarnTransactionMonitor />);

    expect(toJSON()).toBeNull();
  });
});
