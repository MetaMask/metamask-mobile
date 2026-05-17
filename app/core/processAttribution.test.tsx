import { store } from '../store';
import extractURLParams from './DeeplinkManager/utils/extractURLParams';
import { processAttribution } from './processAttribution';

jest.mock('../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('./DeeplinkManager/utils/extractURLParams', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('processAttribution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns attribution data when marketing is enabled and deeplink is provided', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: {
        attributionId: 'test123',
        utm_source: 'facebook',
        utm_medium: 'social',
        utm_campaign: 'summer_sale',
        utm_term: 'wallet',
        utm_content: 'banner',
      },
    });

    const result = processAttribution({
      currentDeeplink:
        'metamask://connect?attributionId=test123&utm_source=facebook&utm_medium=social&utm_campaign=summer_sale&utm_term=wallet&utm_content=banner',
      store,
    });
    expect(result).toEqual({
      attributionId: 'test123',
      utm_source: 'facebook',
      utm_medium: 'social',
      utm_campaign: 'summer_sale',
      utm_term: 'wallet',
      utm_content: 'banner',
    });
  });

  it('returns undefined when marketing is disabled', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: false },
    });

    const result = processAttribution({
      currentDeeplink:
        'metamask://connect?attributionId=test123&utm_source=facebook&utm_medium=social&utm_campaign=summer_sale',
      store,
    });
    expect(result).toBeUndefined();
  });

  it('returns undefined when deeplink is null', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });

    const result = processAttribution({ currentDeeplink: null, store });
    expect(result).toBeUndefined();
  });

  it('returns partial data when some UTM params are missing', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: {
        attributionId: 'test123',
        utm_source: 'facebook',
        utm_medium: 'social',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
      },
    });

    const result = processAttribution({
      currentDeeplink:
        'metamask://connect?attributionId=test123&utm_source=facebook&utm_medium=social',
      store,
    });
    expect(result).toEqual({
      attributionId: 'test123',
      utm_source: 'facebook',
      utm_medium: 'social',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
    });
  });

  it('resolves attribution_id (snake_case) when attributionId (camelCase) is absent', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: {
        attributionId: '',
        attribution_id: 'snake-abc',
        utm_source: 'twitter',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
      },
    });

    const result = processAttribution({
      currentDeeplink:
        'metamask://connect?attribution_id=snake-abc&utm_source=twitter',
      store,
    });
    expect(result).toEqual(
      expect.objectContaining({ attributionId: 'snake-abc' }),
    );
  });

  it('prefers camelCase attributionId over snake_case attribution_id', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: {
        attributionId: 'camel-abc',
        attribution_id: 'snake-abc',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
      },
    });

    const result = processAttribution({
      currentDeeplink:
        'metamask://connect?attributionId=camel-abc&attribution_id=snake-abc',
      store,
    });
    expect(result).toEqual(
      expect.objectContaining({ attributionId: 'camel-abc' }),
    );
  });

  it('does not populate attributionId when both camelCase and snake_case IDs are blank', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: {
        attributionId: '',
        attribution_id: '   ',
        utm_source: 'news',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
      },
    });

    const result = processAttribution({
      currentDeeplink: 'metamask://connect',
      store,
    });
    expect(result).toEqual(
      expect.objectContaining({
        attributionId: undefined,
        utm_source: 'news',
      }),
    );
  });

  it('handles empty UTM parameters gracefully', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: {
        attributionId: 'test123',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
      },
    });

    const result = processAttribution({
      currentDeeplink: 'metamask://connect?attributionId=test123',
      store,
    });
    expect(result).toEqual({
      attributionId: 'test123',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
    });
  });
});
