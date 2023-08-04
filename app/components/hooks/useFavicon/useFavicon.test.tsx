import { renderHook, waitFor } from '@testing-library/react-native';
import useFavicon from './useFavicon';
// eslint-disable-next-line import/no-namespace
import * as faviconUtils from '../../../util/favicon';

jest.mock('../../../util/favicon');

describe('useFavicon', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return favicon', async () => {
    (faviconUtils.getFaviconFromCache as jest.Mock).mockReturnValue(null);
    (faviconUtils.getFaviconURLFromHtml as jest.Mock).mockReturnValue('test');

    const spyWriteCache = jest.spyOn(faviconUtils, 'cacheFavicon');
    const spyReadCache = jest.spyOn(faviconUtils, 'getFaviconFromCache');

    const { result } = renderHook(() =>
      useFavicon('https://metamask.github.io/test-dapp/'),
    );

    await waitFor(() => {
      expect(result.current).toEqual({ uri: 'test' });
      expect(spyWriteCache).toHaveBeenCalledTimes(1);
      expect(spyReadCache).toHaveBeenCalledTimes(1);
    });
  });

  it('should return cached favicon', async () => {
    (faviconUtils.getFaviconFromCache as jest.Mock).mockReturnValue(
      'cached-url',
    );
    (faviconUtils.getFaviconURLFromHtml as jest.Mock).mockReturnValue('test');

    const spyReadCache = jest.spyOn(faviconUtils, 'getFaviconFromCache');

    const { result } = renderHook(() =>
      useFavicon('https://metamask.github.io/test-dapp/'),
    );

    await waitFor(() => {
      expect(result.current).toEqual({ uri: 'cached-url' });
      expect(spyReadCache).toHaveBeenCalledTimes(1);
    });
  });
});
