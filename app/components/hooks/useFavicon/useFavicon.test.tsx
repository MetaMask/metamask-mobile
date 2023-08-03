import React from 'react';
import { renderHook } from '@testing-library/react-native';

import useFavicon from './useFavicon';
import getFaviconURLFromHtml from '../../../util/favicon';

jest.mock('../../../util/favicon');

describe('useFavicon', () => {
  it('should render favicon', () => {
    (getFaviconURLFromHtml as jest.Mock).mockReturnValue({ uri: 'test' });

    const faviconUri = renderHook(() =>
      useFavicon('https://metamask.github.io/test-dapp/'),
    );
    expect(faviconUri.result.current).toEqual({ uri: 'test' });
  });
});
