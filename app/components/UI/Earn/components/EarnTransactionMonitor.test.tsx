import React from 'react';
import { render } from '@testing-library/react-native';
import EarnTransactionMonitor from './EarnTransactionMonitor';
import { useEnsureMusdTokenRegistered } from '../hooks/useEnsureMusdTokenRegistered';

jest.mock('../hooks/useEnsureMusdTokenRegistered');

describe('EarnTransactionMonitor', () => {
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

  it('calls useEnsureMusdTokenRegistered hook', () => {
    render(<EarnTransactionMonitor />);

    expect(mockUseEnsureMusdTokenRegistered).toHaveBeenCalledTimes(1);
  });

  it('returns null', () => {
    const { toJSON } = render(<EarnTransactionMonitor />);

    expect(toJSON()).toBeNull();
  });
});
