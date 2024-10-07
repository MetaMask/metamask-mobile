import { store } from '../store';
import extractURLParams from './DeeplinkManager/ParseManager/extractURLParams';
import { processAttribution } from './processAttribution';
import Logger from '../util/Logger';

jest.mock('../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('./DeeplinkManager/ParseManager/extractURLParams', () => jest.fn());
jest.mock('../util/Logger', () => ({
  error: jest.fn(),
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
        utm: JSON.stringify({
          utm_source: 'source',
          utm_medium: 'medium',
          utm_campaign: 'campaign',
          utm_term: 'term',
          utm_content: 'content'
        })
      },
    });

    const result = processAttribution({ currentDeeplink: 'metamask://connect?attributionId=test123&utm=...', store });
    expect(result).toEqual({
      attributionId: 'test123',
      utm: expect.any(String),
      utm_source: 'source',
      utm_medium: 'medium',
      utm_campaign: 'campaign',
      utm_term: 'term',
      utm_content: 'content'
    });
  });

  it('returns undefined when marketing is disabled', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: false },
    });

    const result = processAttribution({ currentDeeplink: 'metamask://connect?attributionId=test123&utm=...', store });
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
        utm: JSON.stringify({
          utm_source: 'source',
          utm_medium: 'medium'
        })
      },
    });

    const result = processAttribution({ currentDeeplink: 'metamask://connect?attributionId=test123&utm=...', store });
    expect(result).toEqual({
      attributionId: 'test123',
      utm: expect.any(String),
      utm_source: 'source',
      utm_medium: 'medium',
      utm_campaign: undefined,
      utm_term: undefined,
      utm_content: undefined
    });
  });

  it('handles JSON parsing errors gracefully', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: {
        attributionId: 'test123',
        utm: 'invalid-json'
      },
    });

    const result = processAttribution({ currentDeeplink: 'metamask://connect?attributionId=test123&utm=invalid-json', store });
    expect(result).toEqual({
      attributionId: 'test123',
      utm: 'invalid-json',
      utm_source: undefined,
      utm_medium: undefined,
      utm_campaign: undefined,
      utm_term: undefined,
      utm_content: undefined
    });
    expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), expect.any(Error));
  });
});
