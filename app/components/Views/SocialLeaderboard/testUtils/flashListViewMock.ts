/**
 * View tests cannot call `jest.mock` except for Engine and device-info.
 * Import this before a Social view that renders FlashList.
 */
jest.mock('@shopify/flash-list', () => jest.requireActual('./flashListMock'));
