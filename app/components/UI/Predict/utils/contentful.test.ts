import { ContentfulClientApi, createClient } from 'contentful';
import { fetchGeoBlockedRegionsFromContentful } from './contentful';
import {
  CONTENTFUL_ACCESS_TOKEN,
  CONTENTFUL_SPACE_ID,
} from '../constants/contentful';

jest.mock('contentful', () => ({
  createClient: jest.fn(),
}));

jest.mock('../constants/contentful', () => ({
  CONTENTFUL_SPACE_ID: jest.fn().mockReturnValue('mockSpaceId'),
  CONTENTFUL_ACCESS_TOKEN: jest.fn().mockReturnValue('mockAccessToken'),
  CONTENTFUL_ENVIRONMENT: 'dev',
  CONTENTFUL_DEFAULT_DOMAIN: 'preview.contentful.com',
}));

describe('fetchGeoBlockedRegionsFromContentful', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const arrangeContentfulResponseItems = () => [
    {
      sys: { id: '1' },
      fields: {
        region: 'US',
      },
    },
    {
      sys: { id: '2' },
      fields: {
        region: 'CN',
      },
    },
  ];

  const arrangeContentfulResponse = (
    items = arrangeContentfulResponseItems(),
  ) => ({
    items,
  });

  type ContentfulResponse = ReturnType<typeof arrangeContentfulResponse>;

  const arrangeMocks = (
    mockContentfulResponse: ContentfulResponse | null = arrangeContentfulResponse(),
    mockContentfulAPIResponse: any | null = arrangeContentfulResponse(),
  ) => {
    const mockContentfulClientGetEntries = jest
      .fn()
      .mockResolvedValue(mockContentfulResponse);
    const mockClient = {
      getEntries: mockContentfulClientGetEntries,
    };

    if (mockContentfulResponse === null) {
      mockContentfulClientGetEntries.mockRejectedValue(
        new Error('Contentful SDK failed'),
      );
    }

    jest
      .mocked(createClient)
      .mockReturnValue(mockClient as unknown as ContentfulClientApi<undefined>);

    const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(() => {
      if (mockContentfulAPIResponse === null) {
        return Promise.reject(new Error('Fetch failed'));
      }
      return Promise.resolve(
        new Response(
          new Blob([JSON.stringify(mockContentfulAPIResponse)], {
            type: 'application/json',
          }),
          { status: 200 },
        ),
      );
    });

    const mockEnv = {
      CONTENTFUL_SPACE_ID: jest
        .mocked(CONTENTFUL_SPACE_ID)
        .mockReturnValue('mockSpaceId'),
      CONTENTFUL_ACCESS_TOKEN: jest
        .mocked(CONTENTFUL_ACCESS_TOKEN)
        .mockReturnValue('mockAccessToken'),
    };

    const mockWarning = jest.spyOn(console, 'warn').mockReturnValue();

    return { mockContentfulClientGetEntries, mockFetch, mockEnv, mockWarning };
  };

  it('returns empty array if env variables are missing', async () => {
    const { mockEnv, mockWarning } = arrangeMocks();
    mockEnv.CONTENTFUL_SPACE_ID.mockReturnValue(undefined);
    mockEnv.CONTENTFUL_ACCESS_TOKEN.mockReturnValue(undefined);
    const result = await fetchGeoBlockedRegionsFromContentful();

    expect(result).toEqual([]);
    expect(mockWarning).toHaveBeenCalledWith(
      'Missing Contentful env variables: PREDICT_CONTENTFUL_SPACE_ID, PREDICT_CONTENTFUL_ACCESS_TOKEN.',
    );
  });

  it('fetches geo-blocked regions using the Contentful SDK', async () => {
    const { mockContentfulClientGetEntries, mockFetch } = arrangeMocks();
    const result = await fetchGeoBlockedRegionsFromContentful();

    expect(mockContentfulClientGetEntries).toHaveBeenCalledWith({
      content_type: 'predictGeoBlockedRegion',
    });
    expect(mockFetch).not.toHaveBeenCalled(); // Did not fallback to fetch call
    expect(result).toEqual([{ region: 'US' }, { region: 'CN' }]);
  });

  it('falls back to direct fetch if Contentful SDK fails', async () => {
    const { mockContentfulClientGetEntries, mockFetch, mockWarning } =
      arrangeMocks(null, { items: [{ region: 'US' }] });
    const result = await fetchGeoBlockedRegionsFromContentful();

    expect(mockContentfulClientGetEntries).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalled(); // Fallback to fetch call
    expect(mockWarning).toHaveBeenCalledWith(
      'Contentful SDK failed, falling back to direct fetch',
      expect.any(Error),
    );
    expect(result).toEqual([{ region: 'US' }]);
  });

  it('returns null if both SDK and fetch fail', async () => {
    const { mockContentfulClientGetEntries, mockFetch, mockWarning } =
      arrangeMocks(null, null);
    const result = await fetchGeoBlockedRegionsFromContentful();

    expect(mockContentfulClientGetEntries).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalled();
    expect(mockWarning).toHaveBeenCalledWith(
      '[fetchGeoBlockedRegionsFromContentful] Fallback fetch failed, gracefully failing.',
      expect.any(Error),
    );
    expect(result).toBe(null);
  });

  it('correctly maps geo-blocked regions from Contentful response', async () => {
    const customItems = [
      {
        sys: { id: '1' },
        fields: { region: 'United States' },
      },
      {
        sys: { id: '2' },
        fields: { region: 'China' },
      },
      {
        sys: { id: '3' },
        fields: { region: 'Iran' },
      },
    ];
    const { mockContentfulClientGetEntries } = arrangeMocks(
      arrangeContentfulResponse(customItems),
    );

    const result = await fetchGeoBlockedRegionsFromContentful();

    expect(mockContentfulClientGetEntries).toHaveBeenCalled();
    expect(result).toEqual([
      { region: 'United States' },
      { region: 'China' },
      { region: 'Iran' },
    ]);
  });

  it('handles empty response gracefully', async () => {
    const { mockContentfulClientGetEntries } = arrangeMocks(
      arrangeContentfulResponse([]),
    );

    const result = await fetchGeoBlockedRegionsFromContentful();

    expect(mockContentfulClientGetEntries).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('configures Contentful client with correct parameters', async () => {
    const { mockEnv } = arrangeMocks();
    mockEnv.CONTENTFUL_SPACE_ID.mockReturnValue('testSpaceId');
    mockEnv.CONTENTFUL_ACCESS_TOKEN.mockReturnValue('testAccessToken');

    await fetchGeoBlockedRegionsFromContentful();

    expect(createClient).toHaveBeenCalledWith({
      space: 'testSpaceId',
      accessToken: 'testAccessToken',
      environment: 'dev', // Should be 'dev' in test environment
      host: 'https://preview.contentful.com/spaces/testSpaceId/environments/dev/entries',
    });
  });

  it('configures fetch URL with correct parameters when falling back', async () => {
    const { mockFetch, mockEnv } = arrangeMocks(null, { items: [] });
    mockEnv.CONTENTFUL_SPACE_ID.mockReturnValue('testSpaceId');
    mockEnv.CONTENTFUL_ACCESS_TOKEN.mockReturnValue('testAccessToken');

    await fetchGeoBlockedRegionsFromContentful();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://preview.contentful.com/spaces/testSpaceId/environments/dev/entries?access_token=testAccessToken&content_type=predictGeoBlockedRegion',
    );
  });
});
