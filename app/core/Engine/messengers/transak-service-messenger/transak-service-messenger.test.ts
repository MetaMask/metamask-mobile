import { getTransakServiceMessenger } from './transak-service-messenger';
import { Messenger } from '@metamask/messenger';

jest.mock('@metamask/messenger', () => ({
  Messenger: jest.fn().mockImplementation((opts) => ({
    namespace: opts.namespace,
    parent: opts.parent,
  })),
}));

function createMockRootMessenger() {
  return { delegate: jest.fn() };
}

describe('getTransakServiceMessenger', () => {
  it('creates a Messenger with namespace TransakService', () => {
    const mockRootMessenger = createMockRootMessenger();

    const result = getTransakServiceMessenger(mockRootMessenger as never);

    expect(Messenger).toHaveBeenCalledWith({
      namespace: 'TransakService',
      parent: mockRootMessenger,
    });
    expect(result).toEqual(
      expect.objectContaining({
        namespace: 'TransakService',
        parent: mockRootMessenger,
      }),
    );
  });

  it('passes the root messenger as the parent', () => {
    const mockRootMessenger = createMockRootMessenger();

    getTransakServiceMessenger(mockRootMessenger as never);

    expect(Messenger).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: mockRootMessenger,
      }),
    );
  });

  it('delegates AuthenticationController:getBearerToken to the service messenger', () => {
    const mockRootMessenger = createMockRootMessenger();

    const result = getTransakServiceMessenger(mockRootMessenger as never);

    expect(mockRootMessenger.delegate).toHaveBeenCalledWith({
      actions: ['AuthenticationController:getBearerToken'],
      events: [],
      messenger: result,
    });
  });
});
