import type RNFSType from 'react-native-fs';
import type { WidgetTokenPayload } from './buildWidgetPayload';
import type { syncWidgetLogos as SyncWidgetLogos } from './syncWidgetLogos';

jest.mock('react-native-fs', () => ({
  exists: jest.fn(),
  downloadFile: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock('../NativeModules', () => ({
  WidgetBridge: { getLogosDirectoryPath: jest.fn() },
}));

jest.mock('../../util/Logger', () => ({ error: jest.fn() }));

const LOGOS_DIR = '/group/TokenLogos';

const download = (statusCode: number) =>
  ({ promise: Promise.resolve({ statusCode }) }) as ReturnType<
    typeof RNFSType.downloadFile
  >;

const makePayload = (
  tokens: Partial<WidgetTokenPayload['tokens'][number]>[],
): WidgetTokenPayload => ({
  tokens: tokens.map((t) => ({
    symbol: t.symbol ?? 'TKN',
    priceFormatted: t.priceFormatted ?? '$1.00',
    logoUrl: t.logoUrl ?? 'https://logos/TKN.png',
    ...t,
  })),
});

// The SUT memoizes the logos-dir path at module scope, so re-require it fresh
// per test to keep cases independent.
let syncWidgetLogos: typeof SyncWidgetLogos;
let mockExists: jest.MockedFunction<typeof RNFSType.exists>;
let mockDownload: jest.MockedFunction<typeof RNFSType.downloadFile>;
let mockUnlink: jest.MockedFunction<typeof RNFSType.unlink>;
let mockGetDir: jest.MockedFunction<() => Promise<string>>;

describe('syncWidgetLogos', () => {
  beforeEach(() => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RNFS = require('react-native-fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WidgetBridge } = require('../NativeModules');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ({ syncWidgetLogos } = require('./syncWidgetLogos'));

    mockExists = RNFS.exists;
    mockDownload = RNFS.downloadFile;
    mockUnlink = RNFS.unlink;
    mockGetDir = WidgetBridge.getLogosDirectoryPath;

    mockGetDir.mockResolvedValue(LOGOS_DIR);
    mockExists.mockResolvedValue(false);
    mockDownload.mockReturnValue(download(200));
    mockUnlink.mockResolvedValue(undefined);
  });

  it('downloads a logo and rewrites logoUrl to logoFile', async () => {
    const { tokens } = await syncWidgetLogos(
      makePayload([{ symbol: 'ETH', logoUrl: 'https://logos/eth.png' }]),
    );

    expect(mockDownload).toHaveBeenCalledWith({
      fromUrl: 'https://logos/eth.png',
      toFile: `${LOGOS_DIR}/ETH.png`,
    });
    expect(tokens[0]).toMatchObject({ symbol: 'ETH', logoFile: 'ETH.png' });
    expect(tokens[0]).not.toHaveProperty('logoUrl');
  });

  it('skips the download when the file already exists', async () => {
    mockExists.mockResolvedValue(true);

    const { tokens } = await syncWidgetLogos(makePayload([{ symbol: 'ETH' }]));

    expect(mockDownload).not.toHaveBeenCalled();
    expect(tokens[0].logoFile).toBe('ETH.png');
  });

  it.each([
    ['empty', ''],
    ['non-http', 'data:image/png;base64,abc'],
    ['svg', 'https://logos/eth.svg'],
    ['svg with query', 'https://logos/eth.svg?v=2'],
  ])('does not download a %s logo url', async (_label, logoUrl) => {
    const { tokens } = await syncWidgetLogos(
      makePayload([{ symbol: 'ETH', logoUrl }]),
    );

    expect(mockDownload).not.toHaveBeenCalled();
    expect(tokens[0]).not.toHaveProperty('logoFile');
    expect(tokens[0]).not.toHaveProperty('logoUrl');
  });

  it('drops logoFile and cleans up on a non-2xx response', async () => {
    mockDownload.mockReturnValue(download(404));

    const { tokens } = await syncWidgetLogos(makePayload([{ symbol: 'ETH' }]));

    expect(tokens[0]).not.toHaveProperty('logoFile');
    expect(mockUnlink).toHaveBeenCalledWith(`${LOGOS_DIR}/ETH.png`);
  });

  it('treats a download error as a missing logo', async () => {
    mockDownload.mockReturnValue({
      promise: Promise.reject(new Error('network')),
    } as ReturnType<typeof RNFSType.downloadFile>);

    const { tokens } = await syncWidgetLogos(makePayload([{ symbol: 'ETH' }]));

    expect(tokens[0]).not.toHaveProperty('logoFile');
  });

  it('sanitizes the symbol into a safe filename', async () => {
    await syncWidgetLogos(makePayload([{ symbol: 'a/b c' }]));

    expect(mockDownload).toHaveBeenCalledWith(
      expect.objectContaining({ toFile: `${LOGOS_DIR}/a_b_c.png` }),
    );
  });

  it('returns the payload without logos when the container is unavailable', async () => {
    mockGetDir.mockRejectedValue(new Error('app_group_unavailable'));

    const { tokens } = await syncWidgetLogos(
      makePayload([{ symbol: 'ETH' }, { symbol: 'USDC' }]),
    );

    expect(mockDownload).not.toHaveBeenCalled();
    expect(tokens.map((t) => t.symbol)).toEqual(['ETH', 'USDC']);
    expect(tokens[0]).not.toHaveProperty('logoUrl');
    expect(tokens[0]).not.toHaveProperty('logoFile');
  });
});
