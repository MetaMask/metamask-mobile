import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { handleWebDownload } from './handleWebDownload';

jest.mock('../Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/cache',
  writeFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(() => Promise.resolve({ success: true })),
  },
}));

describe('handleWebDownload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when data is missing', async () => {
    await handleWebDownload({ name: 'file.png', type: 'image/png' });

    expect(RNFS.writeFile).not.toHaveBeenCalled();
    expect(Share.open).not.toHaveBeenCalled();
  });

  it('does nothing when payload is undefined', async () => {
    await handleWebDownload(undefined);

    expect(RNFS.writeFile).not.toHaveBeenCalled();
    expect(Share.open).not.toHaveBeenCalled();
  });

  it('writes a base64 data URL and saves it via the share sheet', async () => {
    await handleWebDownload({
      name: 'mm-ten-card-blob.png',
      type: 'image/png',
      data: 'data:image/png;base64,iVBORw0KGgo=',
    });

    expect(RNFS.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/cache\/web-download-\d+-mm-ten-card-blob\.png$/),
      'iVBORw0KGgo=',
      'base64',
    );
    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringMatching(
          /^\/cache\/web-download-\d+-mm-ten-card-blob\.png$/,
        ),
        type: 'image/png',
        filename: 'mm-ten-card-blob.png',
        saveToFiles: true,
        failOnCancel: false,
      }),
    );
    expect(RNFS.unlink).toHaveBeenCalled();
  });

  it('derives the mime type and extension from the data URL when type is absent', async () => {
    await handleWebDownload({
      name: 'chart',
      data: 'data:image/jpeg;base64,abc123',
    });

    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'image/jpeg',
        filename: 'chart.jpg',
      }),
    );
  });

  it('accepts raw base64 without a data URL prefix', async () => {
    await handleWebDownload({
      name: 'doc.pdf',
      type: 'application/pdf',
      data: 'JVBERi0=',
    });

    expect(RNFS.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/cache\/web-download-\d+-doc\.pdf$/),
      'JVBERi0=',
      'base64',
    );
  });

  it('sanitizes unsafe filenames', async () => {
    await handleWebDownload({
      name: '../../etc/pass wd.png',
      type: 'image/png',
      data: 'data:image/png;base64,abc',
    });

    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: '.._.._etc_pass_wd.png',
      }),
    );
  });

  it('cleans up the temp file even when sharing fails', async () => {
    (Share.open as jest.Mock).mockRejectedValueOnce(new Error('share failed'));

    await handleWebDownload({
      name: 'card.png',
      type: 'image/png',
      data: 'data:image/png;base64,abc',
    });

    expect(RNFS.unlink).toHaveBeenCalled();
  });
});
