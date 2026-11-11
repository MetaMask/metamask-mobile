import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useEnsureTransakApiKey } from './useEnsureTransakApiKey';
import Engine from '../../../../core/Engine';

let mockProviderApiKey: string | undefined;

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      transakSetApiKey: jest.fn(),
    },
  },
}));

jest.mock('../../../../selectors/featureFlagController/deposit', () => ({
  selectDepositProviderApiKey: () => mockProviderApiKey,
}));

const createWrapper = () => {
  const store = configureStore({ reducer: { noop: () => ({}) } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store } as never, children);
  };
};

const transakSetApiKey = Engine.context.RampsController
  .transakSetApiKey as jest.Mock;

describe('useEnsureTransakApiKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProviderApiKey = 'test-api-key';
  });

  it('sets the Transak API key on mount when it is available', () => {
    renderHook(() => useEnsureTransakApiKey(), { wrapper: createWrapper() });

    expect(transakSetApiKey).toHaveBeenCalledWith('test-api-key');
  });

  it('does not set the API key when none is available', () => {
    mockProviderApiKey = undefined;

    renderHook(() => useEnsureTransakApiKey(), { wrapper: createWrapper() });

    expect(transakSetApiKey).not.toHaveBeenCalled();
  });
});
