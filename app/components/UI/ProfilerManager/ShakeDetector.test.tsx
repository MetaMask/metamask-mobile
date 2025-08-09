import React from 'react';
import { render } from '@testing-library/react-native';
import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import ShakeDetector from './ShakeDetector';

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

const mockAccelerometer = Accelerometer as jest.Mocked<typeof Accelerometer>;

describe('ShakeDetector', () => {
  const mockOnShake = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(
      <ShakeDetector onShake={mockOnShake} sensibility={1.8} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('configures accelerometer with correct update interval', () => {
    render(<ShakeDetector onShake={mockOnShake} sensibility={1.8} />);
    expect(mockAccelerometer.setUpdateInterval).toHaveBeenCalledWith(150);
  });

  it('adds accelerometer listener on mount', () => {
    render(<ShakeDetector onShake={mockOnShake} sensibility={1.8} />);
    expect(mockAccelerometer.addListener).toHaveBeenCalledTimes(1);
    expect(mockAccelerometer.addListener).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it('removes accelerometer listeners on unmount', () => {
    const { unmount } = render(
      <ShakeDetector onShake={mockOnShake} sensibility={1.8} />,
    );
    unmount();
    expect(mockAccelerometer.removeAllListeners).toHaveBeenCalledTimes(1);
  });

  describe('shake detection', () => {
    let accelerometerCallback: (data: AccelerometerMeasurement) => void;

    beforeEach(() => {
      render(<ShakeDetector onShake={mockOnShake} sensibility={2.0} />);
      const addListenerCall = mockAccelerometer.addListener.mock.calls[0];
      accelerometerCallback = addListenerCall[0];
    });

    it('triggers shake when acceleration exceeds sensibility threshold', () => {
      accelerometerCallback({ x: 2, y: 2, z: 2, timestamp: Date.now() });
      expect(mockOnShake).toHaveBeenCalledTimes(1);
    });

    it('does not trigger shake when acceleration is below threshold', () => {
      accelerometerCallback({ x: 0.5, y: 0.5, z: 0.5, timestamp: Date.now() });
      expect(mockOnShake).not.toHaveBeenCalled();
    });

    it('calculates acceleration magnitude correctly', () => {
      accelerometerCallback({ x: 3, y: 4, z: 0, timestamp: Date.now() });
      expect(mockOnShake).toHaveBeenCalledTimes(1);
    });

    it('debounces shake events within 1 second', () => {
      accelerometerCallback({ x: 3, y: 3, z: 3, timestamp: Date.now() });
      expect(mockOnShake).toHaveBeenCalledTimes(1);
      accelerometerCallback({ x: 3, y: 3, z: 3, timestamp: Date.now() });
      expect(mockOnShake).toHaveBeenCalledTimes(1);
    });

    it('allows shake after debounce period expires', () => {
      accelerometerCallback({ x: 3, y: 3, z: 3, timestamp: Date.now() });
      expect(mockOnShake).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1001);
      accelerometerCallback({ x: 3, y: 3, z: 3, timestamp: Date.now() });
      expect(mockOnShake).toHaveBeenCalledTimes(2);
    });
  });

  describe('sensibility prop', () => {
    it('uses custom sensibility value', () => {
      const customSensibility = 3.0;
      render(
        <ShakeDetector onShake={mockOnShake} sensibility={customSensibility} />,
      );
      const accelerometerCallback =
        mockAccelerometer.addListener.mock.calls[0][0];
      accelerometerCallback({ x: 2, y: 2, z: 1, timestamp: Date.now() });
      expect(mockOnShake).toHaveBeenCalledTimes(1);
    });

    it('uses default sensibility when not provided', () => {
      render(<ShakeDetector onShake={mockOnShake} />);
      const accelerometerCallback =
        mockAccelerometer.addListener.mock.calls[0][0];
      accelerometerCallback({ x: 1, y: 1, z: 1, timestamp: Date.now() });
      expect(mockOnShake).not.toHaveBeenCalled();
      accelerometerCallback({ x: 1.5, y: 1.5, z: 1.5, timestamp: Date.now() });
      expect(mockOnShake).toHaveBeenCalledTimes(1);
    });
  });

  describe('props updates', () => {
    it('updates accelerometer listener when onShake changes', () => {
      const newOnShake = jest.fn();
      const { rerender } = render(
        <ShakeDetector onShake={mockOnShake} sensibility={1.8} />,
      );
      rerender(<ShakeDetector onShake={newOnShake} sensibility={1.8} />);
      expect(mockAccelerometer.addListener).toHaveBeenCalledTimes(2);
    });

    it('updates accelerometer listener when sensibility changes', () => {
      const { rerender } = render(
        <ShakeDetector onShake={mockOnShake} sensibility={1.8} />,
      );
      rerender(<ShakeDetector onShake={mockOnShake} sensibility={2.5} />);
      expect(mockAccelerometer.addListener).toHaveBeenCalledTimes(2);
    });
  });
});
