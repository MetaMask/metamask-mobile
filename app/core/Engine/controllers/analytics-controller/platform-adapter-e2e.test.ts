import { createPlatformAdapter } from './platform-adapter-e2e';

jest.mock('../../../../util/test/utils', () => ({
  E2E_METAMETRICS_TRACK_URL: 'http://localhost/metametrics',
}));

describe('E2E platform adapter', () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true });

  beforeEach(() => {
    fetchMock.mockClear();
    global.fetch = fetchMock;
  });

  it('includes controller context in the captured track body', async () => {
    const adapter = createPlatformAdapter();
    const context = {
      consent: { categoryPreferences: { product: true, marketing: false } },
      eventsConfigVersion: '7',
    };

    adapter.track('Swap Completed', { amount: 1 }, context);
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost/metametrics',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          event: 'Swap Completed',
          properties: { amount: 1 },
          context,
        }),
      }),
    );
  });

  it('includes controller context in the captured identify body', async () => {
    const adapter = createPlatformAdapter();
    const context = {
      consent: { categoryPreferences: { product: true, marketing: false } },
      eventsConfigVersion: '7',
    };

    adapter.identify('user-1', { name: 'Ada' }, context);
    await Promise.resolve();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      event: 'User Identified',
      properties: { userId: 'user-1', name: 'Ada' },
      context,
    });
  });

  it('includes controller context in the captured view body', async () => {
    const adapter = createPlatformAdapter();
    const context = {
      consent: { categoryPreferences: { product: true, marketing: false } },
      eventsConfigVersion: '7',
    };

    adapter.view('Home', { category: 'wallet' }, context);
    await Promise.resolve();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      event: 'Screen Viewed',
      properties: { screen_name: 'Home', category: 'wallet' },
      context,
    });
  });

  it('omits context when the controller does not provide one', async () => {
    const adapter = createPlatformAdapter();

    adapter.track('Swap Completed', { amount: 1 });
    await Promise.resolve();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      event: 'Swap Completed',
      properties: { amount: 1 },
    });
  });
});
