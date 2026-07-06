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
      .mockImplementation((task: () => void) => {
        task();
        return { cancel: jest.fn() };
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
});
