import { renderHook, waitFor } from '@testing-library/react-native';
import useFavicon from './useFavicon';
import { getFaviconURLFromHtml } from '../../../util/favicon';

jest.mock('../../../util/favicon');

describe('useFavicon', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns favicon URL', async () => {
    const origin = 'https://metamask.github.io/test-dapp/';
    const expectedURL = 'https://metamask.github.io/test-dapp/favicon.svg';
    (getFaviconURLFromHtml as jest.Mock).mockReturnValue(expectedURL);

    const { result } = renderHook(() => useFavicon(origin));

    await waitFor(() => {
      expect(result.current).toEqual({ uri: expectedURL });
    });
  });
});
