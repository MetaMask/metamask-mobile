import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedFox from './';
import { getTotalMemorySync } from 'react-native-device-info';

jest.mock('react-native-device-info', () => ({
  getTotalMemorySync: jest.fn(),
}));

jest.mock('react-native-sensors', () => ({
  gyroscope: {
    subscribe: jest.fn(({ next }) => {
      next({ x: 1, y: 2 });

      return { unsubscribe: jest.fn() };
    }),
  },
  setUpdateIntervalForType: jest.fn(),
  SensorTypes: {
    gyroscope: 'gyroscope',
  },
}));

describe('AnimatedFox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders correctly and matches snapshot', () => {
    // Mock device memory to ensure consistent environment for snapshot
    (getTotalMemorySync as jest.Mock).mockReturnValueOnce(
      3 * 1024 * 1024 * 1024,
    ); // Mock 3GB device

    const { toJSON } = render(<AnimatedFox bgColor="black" />);
    expect(toJSON()).toMatchSnapshot();
  });
});
