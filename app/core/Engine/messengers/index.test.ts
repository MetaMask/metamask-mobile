import type { RootExtendedMessenger } from '../types';

const mockSampleMessengerModuleLoaded = jest.fn();
jest.mock(
  '../../../features/SampleFeature/controllers/sample-petnames-controller-messenger',
  () => {
    mockSampleMessengerModuleLoaded();
    return { getSamplePetnamesControllerMessenger: jest.fn() };
  },
);

// Required inside the tests so the mock above is initialized before the
// module under test can (incorrectly) load the SampleFeature messenger.
const loadMessengerFactories = (): typeof import('.').MESSENGER_FACTORIES =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('.').MESSENGER_FACTORIES;

describe('MESSENGER_FACTORIES', () => {
  describe('SamplePetnamesController', () => {
    it('does not load the SampleFeature messenger module when INCLUDE_SAMPLE_FEATURE is unset', () => {
      loadMessengerFactories();

      expect(mockSampleMessengerModuleLoaded).not.toHaveBeenCalled();
    });

    it('does not create a messenger when INCLUDE_SAMPLE_FEATURE is unset', () => {
      const messengerFactories = loadMessengerFactories();

      const messenger =
        messengerFactories.SamplePetnamesController.getMessenger(
          {} as RootExtendedMessenger,
        );

      expect(messenger).toBeUndefined();
    });
  });
});
