/** View tests import this so FlashList renders through the stand-in. */
jest.mock('@shopify/flash-list', () => jest.requireActual('./flashListMock'));
