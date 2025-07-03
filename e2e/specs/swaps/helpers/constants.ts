import { mockEvents } from '../../../api-mocking/mock-config/mock-events.js';

export const localNodeOptions = {
  hardfork: 'london',
  mnemonic:
    'drive manage close raven tape average sausage pledge riot furnace august tip',
  chainId: 1,
};

export const testSpecificMock = {
    POST: [mockEvents.POST.segmentTrack],
};
