import { SpeculosHttpTransport } from '../mocks/SpeculosHttpTransport';

describe('SpeculosHttpTransport', () => {
  let transport: SpeculosHttpTransport;

  beforeEach(() => {
    transport = new SpeculosHttpTransport('localhost', 5000);
  });

  it('starts as not opened', () => {
    expect(transport.isOpened).toBe(false);
  });

  it('open() sets opened to true', () => {
    transport.open();
    expect(transport.isOpened).toBe(true);
  });

  it('close() sets opened to false and emits disconnect', async () => {
    const listener = jest.fn();
    transport.on('disconnect', listener);
    transport.open();
    expect(transport.isOpened).toBe(true);

    await transport.close();

    expect(transport.isOpened).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  describe('exchange()', () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
      fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ data: '9000' }),
      } as Response);
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('sends correct hex APDU and returns Uint8Array', async () => {
      const apdu = new Uint8Array([0xe0, 0x01, 0x00, 0x00]);
      const result = await transport.exchange(apdu);

      expect(fetchSpy).toHaveBeenCalledWith('http://localhost:5000/apdu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'e0010000' }),
      });

      expect(result).toBeInstanceOf(Uint8Array);
      expect(Array.from(result)).toEqual([0x90, 0x00]);
    });

    it('throws on HTTP error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(transport.exchange(new Uint8Array([0x00]))).rejects.toThrow(
        'Speculos APDU exchange failed: HTTP 500',
      );
    });
  });

  it('setScrambleKey() is a no-op', () => {
    expect(() => transport.setScrambleKey('key')).not.toThrow();
  });
});
