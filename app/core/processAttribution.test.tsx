import { store } from '../store';
import extractURLParams from './DeeplinkManager/ParseManager/extractURLParams';
import { processAttribution } from './processAttribution';

jest.mock('../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('./DeeplinkManager/ParseManager/extractURLParams', () => jest.fn());

describe('processAttribution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns attributionId and utm when marketing is enabled and deeplink is provided', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: { attributionId: 'test123', utm: 'utm_test' },
    });

    const result = processAttribution({ currentDeeplink: 'metamask://connect?attributionId=test123&utm=utm_test', store });
    expect(result).toEqual({ attributionId: 'test123', utm: 'utm_test' });
  });

  it('returns undefined values when marketing is disabled', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: false },
    });

    const result = processAttribution({ currentDeeplink: 'metamask://connect?attributionId=test123&utm=utm_test', store });
    expect(result).toEqual({ attributionId: undefined, utm: undefined });
  });

  it('returns undefined values when deeplink is null', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });

    const result = processAttribution({ currentDeeplink: null, store });
    expect(result).toEqual({ attributionId: undefined, utm: undefined });
  });

  it('returns undefined values when attributionId and utm are not present in params', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: {},
    });

    const result = processAttribution({ currentDeeplink: 'metamask://connect', store });
    expect(result).toEqual({ attributionId: undefined, utm: undefined });
  });

  it('returns attributionId as undefined when only utm is present', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: { utm: 'utm_test' },
    });

    const result = processAttribution({ currentDeeplink: 'metamask://connect?utm=utm_test', store });
    expect(result).toEqual({ attributionId: undefined, utm: 'utm_test' });
  });

  it('returns utm as undefined when only attributionId is present', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: { attributionId: 'test123' },
    });

    const result = processAttribution({ currentDeeplink: 'metamask://connect?attributionId=test123', store });
    expect(result).toEqual({ attributionId: 'test123', utm: undefined });
  });
});
