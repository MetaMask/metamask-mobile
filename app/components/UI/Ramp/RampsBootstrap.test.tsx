import React from 'react';
import { render } from '@testing-library/react-native';
import RampsBootstrap from './RampsBootstrap';

const mockUseRampsSmartRouting = jest.fn();
const mockUseRampsProviders = jest.fn();

jest.mock('./hooks/useRampsSmartRouting', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseRampsSmartRouting(...args),
}));

jest.mock('./hooks/useRampsProviders', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseRampsProviders(...args),
}));

describe('RampsBootstrap', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls useRampsSmartRouting on mount', () => {
    render(<RampsBootstrap />);

    expect(mockUseRampsSmartRouting).toHaveBeenCalledTimes(1);
  });

  it('calls useRampsProviders on mount', () => {
    render(<RampsBootstrap />);

    expect(mockUseRampsProviders).toHaveBeenCalledTimes(1);
  });

  it('renders null', () => {
    const { toJSON } = render(<RampsBootstrap />);

    expect(toJSON()).toBeNull();
  });
});
