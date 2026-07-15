import { getTransakServiceMessenger } from './transak-service-messenger';
import { Messenger } from '@metamask/messenger';

jest.mock('@metamask/messenger', () => ({
  Messenger: jest.fn().mockImplementation((opts) => ({
    namespace: opts.namespace,
    parent: opts.parent,
  })),
}));

describe('getTransakServiceMessenger', () => {
  it('creates a Messenger with namespace TransakService', () => {
    const mockRootMessenger = {} as never;

    const result = getTransakServiceMessenger(mockRootMessenger);

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
    const mockRootMessenger = { id: 'root-messenger' } as never;

    getTransakServiceMessenger(mockRootMessenger);

    expect(Messenger).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: mockRootMessenger,
      }),
    );
  });
});
