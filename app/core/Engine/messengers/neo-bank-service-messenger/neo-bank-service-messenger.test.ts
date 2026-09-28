import { getNeoBankServiceMessenger } from './neo-bank-service-messenger';
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

describe('getNeoBankServiceMessenger', () => {
  it('creates a Messenger with namespace NeoBankService', () => {
    const mockRootMessenger = createMockRootMessenger();

    const result = getNeoBankServiceMessenger(mockRootMessenger as never);

    expect(Messenger).toHaveBeenCalledWith({
      namespace: 'NeoBankService',
      parent: mockRootMessenger,
    });
    expect(result).toEqual(
      expect.objectContaining({
        namespace: 'NeoBankService',
        parent: mockRootMessenger,
      }),
    );
  });

  it('passes the root messenger as the parent', () => {
    const mockRootMessenger = createMockRootMessenger();

    getNeoBankServiceMessenger(mockRootMessenger as never);

    expect(Messenger).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: mockRootMessenger,
      }),
    );
  });

  it('delegates AuthenticationController:getBearerToken to the service messenger', () => {
    const mockRootMessenger = createMockRootMessenger();

    const result = getNeoBankServiceMessenger(mockRootMessenger as never);

    expect(mockRootMessenger.delegate).toHaveBeenCalledWith({
      actions: ['AuthenticationController:getBearerToken'],
      events: [],
      messenger: result,
    });
  });
});
