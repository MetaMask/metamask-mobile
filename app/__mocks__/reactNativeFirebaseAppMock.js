export default {
  __esModule: true,
  default: {
    utils: () => ({
      playServicesAvailability: {
        status: 1,
        isAvailable: false,
        hasResolution: true,
        isUserResolvableError: true,
      },
      makePlayServicesAvailable: jest.fn(() => Promise.resolve()),
      resolutionForPlayServices: jest.fn(() => Promise.resolve()),
      promptForPlayServices: jest.fn(() => Promise.resolve()),
    }),
  },
};
