import { Alert, InteractionManager, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import { handleWebDownload } from './handleWebDownload';

jest.mock('../Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/cache',
  DownloadDirectoryPath: '/downloads',
  writeFile: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    MediaCollection: {
      copyToMediaStore: jest.fn(() => Promise.resolve('content://downloads/1')),
    },
  },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(() => Promise.resolve({ success: true })),
  },
}));

/** Simulates the user pressing a button in the download confirmation dialog. */
const pressDialogButton =
  (style: 'cancel' | 'default') =>
  (...args: Parameters<typeof Alert.alert>): void => {
    const buttons = args[2];
    const button =
      style === 'cancel'
        ? buttons?.find((b) => b.style === 'cancel')
        : buttons?.find((b) => b.style !== 'cancel');
    button?.onPress?.();
  };

describe('handleWebDownload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Default: accept the Android download confirmation dialog.
    jest.spyOn(Alert, 'alert').mockImplementation(pressDialogButton('default'));
    jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((task) => {
        if (typeof task === 'function') {
          task();
        }
        return {
          then: jest.fn(),
          done: jest.fn(),
          cancel: jest.fn(),
        };
      });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('ignores payloads without data', async () => {
    await handleWebDownload(undefined);
    await handleWebDownload({ filename: 'x.png' });

    expect(RNFS.writeFile).not.toHaveBeenCalled();
  });

  it('saves to the Downloads MediaStore on Android 10+', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(33);

    await handleWebDownload({
      filename: 'mm-ten-card-blob.png',
      mimeType: 'image/png',
      data: 'data:image/png;base64,iVBORw0KGgo=',
    });

    expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
    expect(RNFS.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\/cache\/web-download-\d+-mm-ten-card-blob\.png$/,
      ),
      'iVBORw0KGgo=',
      'base64',
    );
    expect(
      ReactNativeBlobUtil.MediaCollection.copyToMediaStore,
    ).toHaveBeenCalledWith(
      { name: 'mm-ten-card-blob.png', parentFolder: '', mimeType: 'image/png' },
      'Download',
      expect.stringMatching(
        /^\/cache\/web-download-\d+-mm-ten-card-blob\.png$/,
      ),
    );
    expect(Alert.alert).toHaveBeenCalled();

    expect(RNFS.unlink).not.toHaveBeenCalled();
    jest.advanceTimersByTime(120_000);
    expect(RNFS.unlink).toHaveBeenCalled();
  });

  it('does not save when the user declines the Android confirmation', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(33);
    (Alert.alert as jest.Mock).mockImplementation(pressDialogButton('cancel'));

    await handleWebDownload({
      filename: 'card.png',
      mimeType: 'image/png',
      data: 'data:image/png;base64,abc123',
    });

    expect(RNFS.writeFile).not.toHaveBeenCalled();
    expect(
      ReactNativeBlobUtil.MediaCollection.copyToMediaStore,
    ).not.toHaveBeenCalled();
  });

  it('copies directly to the Downloads folder on Android < 10', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(28);

    await handleWebDownload({
      filename: 'report.pdf',
      mimeType: 'application/pdf',
      data: 'JVBERi0=',
    });

    expect(
      ReactNativeBlobUtil.MediaCollection.copyToMediaStore,
    ).not.toHaveBeenCalled();
    expect(RNFS.copyFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/cache\/web-download-\d+-report\.pdf$/),
      '/downloads/report.pdf',
    );
  });

  it('derives a filename from the mime type when none is provided', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(33);

    await handleWebDownload({
      mimeType: 'image/png',
      data: 'data:image/png;base64,iVBORw0KGgo=',
    });

    expect(
      ReactNativeBlobUtil.MediaCollection.copyToMediaStore,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringMatching(/^download-\d+\.png$/),
        mimeType: 'image/png',
      }),
      'Download',
      expect.any(String),
    );
  });

  it('presents the share sheet with saveToFiles on iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    await handleWebDownload({
      filename: 'card.png',
      mimeType: 'image/png',
      data: 'data:image/png;base64,abc123',
    });

    expect(
      ReactNativeBlobUtil.MediaCollection.copyToMediaStore,
    ).not.toHaveBeenCalled();
    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringMatching(
          /^file:\/\/\/cache\/web-download-\d+-card\.png$/,
        ),
        filename: 'card.png',
        type: 'image/png',
        saveToFiles: true,
        failOnCancel: false,
      }),
    );
  });

  it('alerts and cleans up when writing fails', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(33);
    (RNFS.writeFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await handleWebDownload({
      filename: 'card.png',
      mimeType: 'image/png',
      data: 'data:image/png;base64,abc123',
    });

    expect(Alert.alert).toHaveBeenCalledWith('download_files.error');
    jest.advanceTimersByTime(120_000);
    expect(RNFS.unlink).toHaveBeenCalled();
  });
});
