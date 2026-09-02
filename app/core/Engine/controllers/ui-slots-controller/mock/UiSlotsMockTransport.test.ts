import { UiSlotsMockTransport } from './UiSlotsMockTransport';

describe('UiSlotsMockTransport', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    delete process.env.MM_UI_SLOTS_MOCK_FAILURE;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('serves the Wallet homepage Predict discovery fixture', async () => {
    const transport = new UiSlotsMockTransport();

    const request = transport.fetchScreen({
      screenId: 'wallet-home',
      locale: 'en',
    });
    jest.advanceTimersByTime(250);
    const result = await request;

    expect(result).toEqual(
      expect.objectContaining({
        status: 'modified',
        value: expect.objectContaining({
          screenId: 'wallet-home',
          locale: 'en',
          slots: expect.arrayContaining([
            expect.objectContaining({
              slotId: 'wallet-home.predict-empty-state',
            }),
          ]),
        }),
      }),
    );
  });
});
