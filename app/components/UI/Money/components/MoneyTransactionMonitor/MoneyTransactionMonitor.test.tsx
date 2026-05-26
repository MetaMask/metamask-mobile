import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyTransactionMonitor from './MoneyTransactionMonitor';
import { useMoneyTransactionStatus } from '../../hooks/useMoneyTransactionStatus';

jest.mock('../../hooks/useMoneyTransactionStatus');

describe('MoneyTransactionMonitor', () => {
  const mockUseMoneyTransactionStatus = jest.mocked(useMoneyTransactionStatus);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders without crashing', () => {
    const result = render(<MoneyTransactionMonitor />);

    expect(result).toBeDefined();
  });

  it('calls useMoneyTransactionStatus exactly once', () => {
    render(<MoneyTransactionMonitor />);

    expect(mockUseMoneyTransactionStatus).toHaveBeenCalledTimes(1);
  });

  it('returns null', () => {
    const { toJSON } = render(<MoneyTransactionMonitor />);

    expect(toJSON()).toBeNull();
  });
});
