import EntryScriptWeb3 from './EntryScriptWeb3';
import Device from '../util/device';
import { readFileAssets, readFile } from 'react-native-fs';

jest.mock('../util/device', () => ({
  isIos: jest.fn().mockReturnValue(false),
}));

jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
  readFileAssets: jest.fn(),
  MainBundlePath: '/path/to/main/bundle',
}));

describe('EntryScriptWeb3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    EntryScriptWeb3.entryScriptWeb3 = null;
  });

  describe('init', () => {
    it('should read file from assets on non-iOS platforms', async () => {
      (Device.isIos as jest.Mock).mockReturnValue(false);
      (readFileAssets as jest.Mock).mockResolvedValue('Android script content');

      const result = await EntryScriptWeb3.init();

      expect(readFileAssets).toHaveBeenCalledWith('InpageBridgeWeb3.js');
      expect(result).toBe('Android script content');
      expect(EntryScriptWeb3.entryScriptWeb3).toBe('Android script content');
    });
  });

  describe('get', () => {
    it('should return cached script if available', async () => {
      EntryScriptWeb3.entryScriptWeb3 = 'Cached script';

      const result = await EntryScriptWeb3.get();

      expect(result).toBe('Cached script');
      expect(readFile).not.toHaveBeenCalled();
      expect(readFileAssets).not.toHaveBeenCalled();
    });

    it('should call init if cache is empty', async () => {
      const initSpy = jest
        .spyOn(EntryScriptWeb3, 'init')
        .mockResolvedValue('New script content');

      const result = await EntryScriptWeb3.get();

      expect(result).toBe('New script content');
      expect(initSpy).toHaveBeenCalled();
    });

    it('should propagate errors from init', async () => {
      jest
        .spyOn(EntryScriptWeb3, 'init')
        .mockRejectedValue(new Error('Init error'));

      await expect(EntryScriptWeb3.get()).rejects.toThrow('Init error');
    });
  });
});
