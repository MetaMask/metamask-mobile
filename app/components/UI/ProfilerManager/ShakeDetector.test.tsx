import React from 'react';
import { render } from '@testing-library/react-native';
import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import ShakeDetector from './ShakeDetector';

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
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

  it('removes only its own accelerometer listener on unmount', () => {
    const { unmount } = render(
      <ShakeDetector onShake={mockOnShake} sensibility={1.8} />,
    );
    const subscription = (mockAccelerometer.addListener as jest.Mock).mock
      .results[0].value;
    unmount();
    expect(subscription.remove).toHaveBeenCalledTimes(1);
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
});
