import {
  AppState,
  Platform,
  type AppStateStatus,
  type View,
} from 'react-native';
import Share from 'react-native-share';
import { captureRef } from 'react-native-view-shot';
import {
  ANDROID_CHOOSER_OPEN_TIMEOUT_MS,
  shareShareCardImage,
} from './shareCardImage';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn() },
}));

const mockCaptureRef = jest.mocked(captureRef);
const mockShareOpen = jest.mocked(Share.open);
const card = {} as View;
const originalOS = Platform.OS;

const setOS = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

/** Collects the AppState listener so a test can drive foreground changes. */
const mockAppState = () => {
  let listener: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
    listener = handler;
    return { remove } as ReturnType<typeof AppState.addEventListener>;
  });
  return {
    emit: (state: AppStateStatus) => listener?.(state),
    remove,
  };
};

const flushPromises = () =>
  new Promise(jest.requireActual('timers').setImmediate);

describe('shareShareCardImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaptureRef.mockResolvedValue('file:///tmp/card.png');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    setOS(originalOS);
  });

  describe('on iOS', () => {
    beforeEach(() => setOS('ios'));

    it('captures a 1080px PNG and shares it with the message', async () => {
      mockShareOpen.mockResolvedValue({ success: true, message: '' });

      const outcome = await shareShareCardImage(card, {
        message: 'https://link.metamask.io/position',
      });

      expect(mockCaptureRef).toHaveBeenCalledWith(card, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: 1080,
        result: 'tmpfile',
      });
      expect(mockShareOpen).toHaveBeenCalledWith({
        url: 'file:///tmp/card.png',
        type: 'image/png',
        message: 'https://link.metamask.io/position',
        failOnCancel: false,
      });
      expect(outcome).toBe('shared');
    });

    it('reports a dismissed sheet', async () => {
      mockShareOpen.mockResolvedValue({
        success: false,
        dismissedAction: true,
        message: '',
      });

      await expect(shareShareCardImage(card)).resolves.toBe('dismissed');
      expect(mockShareOpen).toHaveBeenCalledWith(
        expect.not.objectContaining({ message: expect.anything() }),
      );
    });
  });

  describe('on Android', () => {
    beforeEach(() => setOS('android'));

    it('ends the share when the user returns from the chooser', async () => {
      const appState = mockAppState();
      mockShareOpen.mockReturnValue(new Promise(() => undefined));

      const result = shareShareCardImage(card);
      await flushPromises();
      appState.emit('background');
      appState.emit('active');

      await expect(result).resolves.toBe('unknown');
      expect(appState.remove).toHaveBeenCalled();
    });

    it('uses the share sheet result when it arrives first', async () => {
      mockAppState();
      mockShareOpen.mockResolvedValue({ success: true, message: '' });

      await expect(shareShareCardImage(card)).resolves.toBe('shared');
    });

    it('stops waiting when the chooser never takes over the screen', async () => {
      jest.useFakeTimers();
      mockAppState();
      mockShareOpen.mockReturnValue(new Promise(() => undefined));

      const result = shareShareCardImage(card);
      await flushPromises();
      jest.advanceTimersByTime(ANDROID_CHOOSER_OPEN_TIMEOUT_MS);

      await expect(result).resolves.toBe('unknown');
    });

    it('keeps waiting while the chooser is open', async () => {
      jest.useFakeTimers();
      const appState = mockAppState();
      mockShareOpen.mockReturnValue(new Promise(() => undefined));
      const onSettled = jest.fn();

      shareShareCardImage(card).then(onSettled);
      await flushPromises();
      appState.emit('background');
      jest.advanceTimersByTime(ANDROID_CHOOSER_OPEN_TIMEOUT_MS * 2);
      await flushPromises();

      expect(onSettled).not.toHaveBeenCalled();
    });
  });
});
