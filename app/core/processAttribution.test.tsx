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

  it('maps attribution_id (snake_case) to attributionId like deeplink save path', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: {
        attributionId: '',
        attribution_id: 'snake-value',
        utm_source: 'src',
        utm_medium: 'med',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
      },
    });

    const result = processAttribution({
      currentDeeplink:
        'metamask://connect?attribution_id=snake-value&utm_source=src&utm_medium=med',
      store,
    });
    expect(result).toEqual({
      attributionId: 'snake-value',
      utm_source: 'src',
      utm_medium: 'med',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
    });
  });

  it('prefers attributionId over attribution_id when both are present', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: {
        attributionId: 'camel',
        attribution_id: 'snake',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
      },
    });

    const result = processAttribution({
      currentDeeplink:
        'metamask://connect?attributionId=camel&attribution_id=snake',
      store,
    });
    expect(result?.attributionId).toBe('camel');
  });
});
