import React from 'react';
import { render } from '@testing-library/react-native';
import RampsBootstrap from './RampsBootstrap';

const mockUseDetectGeolocation = jest.fn();
const mockUseRampsSmartRouting = jest.fn();
const mockUseHydrateRampsController = jest.fn();
const mockUseRampsProviders = jest.fn();

jest.mock('./hooks/useDetectGeolocation', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseDetectGeolocation(...args),
}));

jest.mock('./hooks/useRampsSmartRouting', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseRampsSmartRouting(...args),
}));

jest.mock('./hooks/useHydrateRampsController', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseHydrateRampsController(...args),
}));

jest.mock('./hooks/useRampsProviders', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseRampsProviders(...args),
}));

describe('RampsBootstrap', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls useDetectGeolocation on mount', () => {
    render(<RampsBootstrap />);

    expect(mockUseDetectGeolocation).toHaveBeenCalledTimes(1);
  });

  it('calls useRampsSmartRouting on mount', () => {
    render(<RampsBootstrap />);

    expect(mockUseRampsSmartRouting).toHaveBeenCalledTimes(1);
  });

  it('calls useHydrateRampsController on mount', () => {
    render(<RampsBootstrap />);

    expect(mockUseHydrateRampsController).toHaveBeenCalledTimes(1);
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
