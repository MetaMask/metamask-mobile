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

  it('returns attributionId when marketing is enabled and deeplink is provided', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: { attributionId: 'test123' },
    });

    const result = processAttribution({ currentDeeplink: 'metamask://connect?attributionId=test123', store });
    expect(result).toBe('test123');
  });

  it('returns undefined when marketing is disabled', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: false },
    });

    const result = processAttribution({ currentDeeplink: 'metamask://connect?attributionId=test123', store });
    expect(result).toBeUndefined();
  });

  it('returns undefined when deeplink is null', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });

    const result = processAttribution({ currentDeeplink: null, store });
    expect(result).toBeUndefined();
  });

  it('returns undefined when attributionId is not present in params', () => {
    (store.getState as jest.Mock).mockReturnValue({
      security: { dataCollectionForMarketing: true },
    });
    (extractURLParams as jest.Mock).mockReturnValue({
      params: {},
    });

    const result = processAttribution({ currentDeeplink: 'metamask://connect', store });
    expect(result).toBeUndefined();
  });
});
