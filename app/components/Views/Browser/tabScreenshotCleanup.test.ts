import RNFS from 'react-native-fs';
import { deleteTabScreenshotFile } from './tabScreenshotCleanup';

jest.mock('react-native-fs', () => ({
  exists: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

describe('tabScreenshotCleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(RNFS.exists).mockResolvedValue(true);
    jest.mocked(RNFS.unlink).mockResolvedValue(undefined);
  });

  it('deletes screenshots under the React Native temp folder', async () => {
    const uri =
      'file:///private/var/mobile/Containers/Data/Application/abc/tmp/ReactNative/screenshot.jpg';

    await deleteTabScreenshotFile(uri);

    expect(RNFS.unlink).toHaveBeenCalledWith(
      '/private/var/mobile/Containers/Data/Application/abc/tmp/ReactNative/screenshot.jpg',
    );
  });

  it('ignores non-temp screenshot paths', async () => {
    await deleteTabScreenshotFile('file:///some/other/path.jpg');

    expect(RNFS.exists).not.toHaveBeenCalled();
    expect(RNFS.unlink).not.toHaveBeenCalled();
  });
});
