jest.mock('axios');
jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));
jest.mock('./utils', () => ({
  getCommandQueueServerPortInApp: () => 2446,
}));

import axios from 'axios';
import { store } from '../../store';
import { captureAppState, handleExportStateCommand } from './e2eStateExport';

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetState = store.getState as jest.Mock;

describe('e2eStateExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('captureAppState', () => {
    it('splits state into redux and engine', () => {
      mockedGetState.mockReturnValue({
        settings: { theme: 'dark' },
        engine: {
          backgroundState: {
            NetworkController: { selectedNetworkClientId: 'mainnet' },
          },
        },
      });

      const result = captureAppState();

      expect(result.redux).toEqual({ settings: { theme: 'dark' } });
      expect(result.engine).toEqual({
        NetworkController: { selectedNetworkClientId: 'mainnet' },
      });
    });

    it('returns empty engine when backgroundState is missing', () => {
      mockedGetState.mockReturnValue({
        settings: { theme: 'light' },
        engine: {},
      });

      const result = captureAppState();

      expect(result.redux).toEqual({ settings: { theme: 'light' } });
      expect(result.engine).toEqual({});
    });

    it('strips non-serializable values via JSON round-trip', () => {
      mockedGetState.mockReturnValue({
        settings: { callback: undefined, name: 'test' },
        engine: { backgroundState: {} },
      });

      const result = captureAppState();

      // undefined values are stripped by JSON.stringify
      expect(result.redux).toEqual({ settings: { name: 'test' } });
    });
  });

  describe('handleExportStateCommand', () => {
    it('POSTs captured state to the command queue server', async () => {
      mockedGetState.mockReturnValue({
        settings: { theme: 'dark' },
        engine: { backgroundState: { NetworkController: {} } },
      });
      mockedAxios.post.mockResolvedValueOnce({ status: 200 });

      await handleExportStateCommand();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:2446/exported-state',
        {
          redux: { settings: { theme: 'dark' } },
          engine: { NetworkController: {} },
        },
      );
    });

    it('does not throw when POST fails', async () => {
      mockedGetState.mockReturnValue({
        settings: {},
        engine: { backgroundState: {} },
      });
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(handleExportStateCommand()).resolves.toBeUndefined();
    });
  });
});
