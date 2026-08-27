import { InteractionManager, Platform, Share as RNShare } from 'react-native';
import Share from 'react-native-share';
import { handleWebShare } from './handleWebShare';

jest.mock('../Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(() => Promise.resolve({ success: true })),
  },
}));

describe('handleWebShare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(RNShare, 'share')
      .mockResolvedValue({ action: RNShare.sharedAction });
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
    jest.restoreAllMocks();
  });

  it('does not call Share when url, text, and files are missing', async () => {
    await handleWebShare({ title: 'Title only' });

    expect(RNShare.share).not.toHaveBeenCalled();
    expect(Share.open).not.toHaveBeenCalled();
  });

  it('shares combined text and url on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    await handleWebShare({
      title: 'My Title',
      text: 'Check this out',
      url: 'https://example.com',
    });

    expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
    expect(RNShare.share).toHaveBeenCalledWith(
      {
        title: 'My Title',
        message: 'Check this out https://example.com',
      },
      {
        dialogTitle: 'My Title',
        subject: 'My Title',
      },
    );
  });

  it('shares url only on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    await handleWebShare({ url: 'https://example.com' });

    expect(RNShare.share).toHaveBeenCalledWith(
      {
        message: 'https://example.com',
      },
      {
        dialogTitle: undefined,
        subject: undefined,
      },
    );
  });

  it('shares text and url separately on iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    await handleWebShare({
      title: 'My Title',
      text: 'Check this out',
      url: 'https://example.com',
    });

    expect(InteractionManager.runAfterInteractions).not.toHaveBeenCalled();
    expect(RNShare.share).toHaveBeenCalledWith(
      {
        title: 'My Title',
        message: 'Check this out',
        url: 'https://example.com',
      },
      {
        dialogTitle: 'My Title',
        subject: 'My Title',
      },
    );
  });

  it('shares image files via the system share sheet on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    await handleWebShare({
      title: 'My Card',
      text: 'Check out my card',
      files: [
        {
          name: 'card.png',
          type: 'image/png',
          data: 'data:image/png;base64,iVBORw0KGgo=',
        },
      ],
    });

    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'data:image/png;base64,iVBORw0KGgo=',
        type: 'image/png',
        filename: 'card.png',
        message: 'Check out my card',
        title: 'My Card',
        subject: 'My Card',
        failOnCancel: false,
        useInternalStorage: true,
      }),
    );
    expect(RNShare.share).not.toHaveBeenCalled();
  });

  it('shares image files via the system share sheet on iOS without useInternalStorage', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    await handleWebShare({
      files: [
        {
          name: 'card.png',
          type: 'image/png',
          data: 'data:image/png;base64,abc123',
        },
      ],
    });

    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'data:image/png;base64,abc123',
        type: 'image/png',
        filename: 'card.png',
      }),
    );
    expect(Share.open).toHaveBeenCalledWith(
      expect.not.objectContaining({ useInternalStorage: true }),
    );
  });

  it('shares every file via urls/filenames arrays for multi-file shares on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    await handleWebShare({
      title: 'My Cards',
      text: 'Check out my cards',
      files: [
        {
          name: 'card.png',
          type: 'image/png',
          data: 'data:image/png;base64,iVBORw0KGgo=',
        },
        {
          name: 'card.jpg',
          type: 'image/jpeg',
          data: 'data:image/jpeg;base64,/9j/4AAQ=',
        },
      ],
    });

    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        urls: [
          'data:image/png;base64,iVBORw0KGgo=',
          'data:image/jpeg;base64,/9j/4AAQ=',
        ],
        filenames: ['card.png', 'card.jpg'],
        message: 'Check out my cards',
        title: 'My Cards',
        subject: 'My Cards',
        failOnCancel: false,
        useInternalStorage: true,
      }),
    );
    expect(Share.open).toHaveBeenCalledWith(
      expect.not.objectContaining({ url: expect.anything() }),
    );
  });

  it('shares every file via urls/filenames arrays for multi-file shares on iOS without useInternalStorage', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    await handleWebShare({
      files: [
        {
          name: 'a.png',
          type: 'image/png',
          data: 'data:image/png;base64,aaa',
        },
        {
          name: 'b.pdf',
          type: 'application/pdf',
          data: 'JVBERi0=',
        },
      ],
    });

    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        urls: [
          'data:image/png;base64,aaa',
          'data:application/pdf;base64,JVBERi0=',
        ],
        filenames: ['a.png', 'b.pdf'],
      }),
    );
    expect(Share.open).toHaveBeenCalledWith(
      expect.not.objectContaining({ useInternalStorage: true }),
    );
  });

  describe('result reporting', () => {
    it('returns an error status when there is nothing to share', async () => {
      const result = await handleWebShare({ title: 'Title only' });

      expect(result).toEqual({
        status: 'error',
        message: 'Nothing to share',
      });
    });

    it('returns success when a text share is completed', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      (RNShare.share as jest.Mock).mockResolvedValue({
        action: RNShare.sharedAction,
      });

      const result = await handleWebShare({ url: 'https://example.com' });

      expect(result).toEqual({ status: 'success' });
    });

    it('returns cancelled when the iOS share sheet is dismissed', async () => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      (RNShare.share as jest.Mock).mockResolvedValue({
        action: RNShare.dismissedAction,
      });

      const result = await handleWebShare({ url: 'https://example.com' });

      expect(result).toEqual({ status: 'cancelled' });
    });

    it('returns success when a file share is completed', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      (Share.open as jest.Mock).mockResolvedValueOnce({ success: true });

      const result = await handleWebShare({
        files: [
          {
            name: 'card.png',
            type: 'image/png',
            data: 'data:image/png;base64,abc123',
          },
        ],
      });

      expect(result).toEqual({ status: 'success' });
    });

    it('returns cancelled when a file share is dismissed', async () => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      (Share.open as jest.Mock).mockResolvedValueOnce({
        success: false,
        dismissedAction: true,
      });

      const result = await handleWebShare({
        files: [
          {
            name: 'card.png',
            type: 'image/png',
            data: 'data:image/png;base64,abc123',
          },
        ],
      });

      expect(result).toEqual({ status: 'cancelled' });
    });

    it('returns an error status when the native share throws', async () => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      (Share.open as jest.Mock).mockRejectedValueOnce(new Error('boom'));

      const result = await handleWebShare({
        files: [
          {
            name: 'card.png',
            type: 'image/png',
            data: 'data:image/png;base64,abc123',
          },
        ],
      });

      expect(result).toEqual({ status: 'error', message: 'boom' });
    });
  });
});
