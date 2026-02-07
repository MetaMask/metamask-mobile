// Mock react-native-performance-toolkit for testing
// This module requires native modules that aren't available in Jest test environment

const mockGetJsFpsBuffer = jest.fn(() => {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setInt32(0, 60, true); // Default to 60 FPS
  return buffer;
});

const mockUnboxedJsFps = {
  getJsFpsBuffer: mockGetJsFpsBuffer,
};

const mockBoxedJsFpsTracking = {
  unbox: jest.fn(() => mockUnboxedJsFps),
};

export const BoxedJsFpsTracking = mockBoxedJsFpsTracking;

// Default export
export default {
  BoxedJsFpsTracking,
};
