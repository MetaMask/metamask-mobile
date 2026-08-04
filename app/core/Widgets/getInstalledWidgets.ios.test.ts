import { getInstalledWidgets } from './getInstalledWidgets.ios';
import { RCTWidgetInfo } from '../NativeModules';
import Logger from '../../util/Logger';

jest.mock('../NativeModules', () => ({
  RCTWidgetInfo: { getInstalledWidgets: jest.fn() },
}));
jest.mock('../../util/Logger');

const mockedRCTWidgetInfo = RCTWidgetInfo as jest.Mocked<typeof RCTWidgetInfo>;
const mockedLogger = Logger as jest.Mocked<typeof Logger>;

describe('getInstalledWidgets (ios)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to the native module and returns its result', async () => {
    mockedRCTWidgetInfo.getInstalledWidgets.mockResolvedValue([
      { kind: 'BalanceWidget', family: 'systemSmall' },
    ]);

    await expect(getInstalledWidgets()).resolves.toEqual([
      { kind: 'BalanceWidget', family: 'systemSmall' },
    ]);
  });

  it('resolves with an empty array when the native module resolves null', async () => {
    mockedRCTWidgetInfo.getInstalledWidgets.mockResolvedValue(
      null as unknown as never,
    );

    await expect(getInstalledWidgets()).resolves.toEqual([]);
  });

  it('resolves with an empty array and logs when the native call rejects', async () => {
    mockedRCTWidgetInfo.getInstalledWidgets.mockRejectedValue(
      new Error('boom'),
    );

    await expect(getInstalledWidgets()).resolves.toEqual([]);
    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'getInstalledWidgets: native call failed',
    );
  });

  it('resolves with an empty array when RCTWidgetInfo is not present (e.g. a stale binary)', async () => {
    const nativeModules = jest.requireMock('../NativeModules') as {
      RCTWidgetInfo: unknown;
    };
    const original = nativeModules.RCTWidgetInfo;
    nativeModules.RCTWidgetInfo = undefined;

    try {
      await expect(getInstalledWidgets()).resolves.toEqual([]);
    } finally {
      nativeModules.RCTWidgetInfo = original;
    }
  });
});
