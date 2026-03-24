import { AppState } from 'react-native';
import {
  QueryClient,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import { addEventListener as addNetInfoEventListener } from '@react-native-community/netinfo';
import { ReactQueryService } from './ReactQueryService';

jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({ clear: jest.fn() })),
  focusManager: { setFocused: jest.fn() },
  onlineManager: { setEventListener: jest.fn() },
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn().mockReturnValue(jest.fn()),
}));

const mockRemove = jest.fn();
(AppState.addEventListener as jest.Mock).mockReturnValue({
  remove: mockRemove,
});

const mockFocusManager = focusManager as jest.Mocked<typeof focusManager>;
const mockOnlineManager = onlineManager as jest.Mocked<typeof onlineManager>;
const mockAddNetInfoEventListener = addNetInfoEventListener as jest.Mock;

describe('ReactQueryService', () => {
  let service: ReactQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    (AppState.addEventListener as jest.Mock).mockReturnValue({
      remove: mockRemove,
    });
    service = new ReactQueryService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('constructor', () => {
    it('creates a QueryClient with expected default options', () => {
      expect(QueryClient).toHaveBeenCalledWith({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            retry: 2,
            gcTime: 1000 * 60 * 60 * 24,
          },
        },
      });
    });

    it('subscribes to AppState changes', () => {
      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
    });

    it('registers an online state listener via onlineManager', () => {
      expect(mockOnlineManager.setEventListener).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });
  });

  describe('app focus state subscription', () => {
    it('sets focused to true when app becomes active', () => {
      const listener = (AppState.addEventListener as jest.Mock).mock
        .calls[0][1];

      listener('active');

      expect(mockFocusManager.setFocused).toHaveBeenCalledWith(true);
    });

    it('sets focused to false when app goes to background', () => {
      const listener = (AppState.addEventListener as jest.Mock).mock
        .calls[0][1];

      listener('background');

      expect(mockFocusManager.setFocused).toHaveBeenCalledWith(false);
    });

    it('sets focused to false when app goes inactive', () => {
      const listener = (AppState.addEventListener as jest.Mock).mock
        .calls[0][1];

      listener('inactive');

      expect(mockFocusManager.setFocused).toHaveBeenCalledWith(false);
    });
  });

  describe('online state subscription', () => {
    it('registers a NetInfo listener through the setEventListener callback', () => {
      const setEventListenerCb =
        mockOnlineManager.setEventListener.mock.calls[0][0];
      const mockSetOnline = jest.fn();

      setEventListenerCb(mockSetOnline);

      expect(mockAddNetInfoEventListener).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('calls setOnline(true) when NetInfo reports connected', () => {
      const setEventListenerCb =
        mockOnlineManager.setEventListener.mock.calls[0][0];
      const mockSetOnline = jest.fn();
      setEventListenerCb(mockSetOnline);

      const netInfoCb = mockAddNetInfoEventListener.mock.calls[0][0];
      netInfoCb({ isConnected: true });

      expect(mockSetOnline).toHaveBeenCalledWith(true);
    });

    it('calls setOnline(false) when NetInfo reports disconnected', () => {
      const setEventListenerCb =
        mockOnlineManager.setEventListener.mock.calls[0][0];
      const mockSetOnline = jest.fn();
      setEventListenerCb(mockSetOnline);

      const netInfoCb = mockAddNetInfoEventListener.mock.calls[0][0];
      netInfoCb({ isConnected: false });

      expect(mockSetOnline).toHaveBeenCalledWith(false);
    });

    it('calls setOnline(false) when isConnected is null', () => {
      const setEventListenerCb =
        mockOnlineManager.setEventListener.mock.calls[0][0];
      const mockSetOnline = jest.fn();
      setEventListenerCb(mockSetOnline);

      const netInfoCb = mockAddNetInfoEventListener.mock.calls[0][0];
      netInfoCb({ isConnected: null });

      expect(mockSetOnline).toHaveBeenCalledWith(false);
    });
  });

  describe('destroy', () => {
    it('removes the AppState subscription', () => {
      service.destroy();

      expect(mockRemove).toHaveBeenCalled();
    });

    it('unsubscribes from NetInfo', () => {
      const mockNetInfoUnsubscribe = jest.fn();
      mockAddNetInfoEventListener.mockReturnValue(mockNetInfoUnsubscribe);

      const freshService = new ReactQueryService();
      const setEventListenerCb =
        mockOnlineManager.setEventListener.mock.calls[1][0];
      setEventListenerCb(jest.fn());

      freshService.destroy();

      expect(mockNetInfoUnsubscribe).toHaveBeenCalled();
    });

    it('clears the query client cache', () => {
      service.destroy();

      expect(service.queryClient.clear).toHaveBeenCalled();
    });
  });
});
