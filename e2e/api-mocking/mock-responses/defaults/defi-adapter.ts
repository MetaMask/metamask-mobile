import { MockApiEndpoint, MockEventsObject } from '../../../framework';

const defiAdaptersRegex =
  /^https:\/\/defiadapters\.api\.cx\.metamask\.io\/positions\/.*$/;

export const noDefiPositionsMock = {
  urlEndpoint: defiAdaptersRegex,
  responseCode: 200,
  response: {
    data: [],
  },
} as unknown as MockApiEndpoint;

export const DEFI_ADAPTERS_MOCKS: MockEventsObject = {
  GET: [noDefiPositionsMock],
};
