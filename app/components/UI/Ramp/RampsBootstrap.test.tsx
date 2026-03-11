import React from 'react';
import { render } from '@testing-library/react-native';
import RampsBootstrap from './RampsBootstrap';

const mockUseRampsSmartRouting = jest.fn();
const mockUseHydrateRampsController = jest.fn();

jest.mock('./hooks/useRampsSmartRouting', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseRampsSmartRouting(...args),
}));

jest.mock('./hooks/useHydrateRampsController', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseHydrateRampsController(...args),
}));

describe('RampsBootstrap', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls useRampsSmartRouting on mount', () => {
    render(<RampsBootstrap />);

    expect(mockUseRampsSmartRouting).toHaveBeenCalledTimes(1);
  });

  it('calls useHydrateRampsController on mount', () => {
    render(<RampsBootstrap />);

    expect(mockUseHydrateRampsController).toHaveBeenCalledTimes(1);
  });

  it('renders null', () => {
    const { toJSON } = render(<RampsBootstrap />);

    expect(toJSON()).toBeNull();
  });
});
