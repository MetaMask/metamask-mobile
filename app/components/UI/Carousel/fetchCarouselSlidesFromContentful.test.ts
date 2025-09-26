import { ContentfulClientApi, createClient } from 'contentful';
// eslint-disable-next-line import/no-namespace
import * as DeviceInfoModule from 'react-native-device-info';
import {
  fetchCarouselSlidesFromContentful,
  isActive,
} from './fetchCarouselSlidesFromContentful';
import { ACCESS_TOKEN, SPACE_ID } from './constants';

jest.mock('contentful', () => ({
  createClient: jest.fn(),
}));

jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  SPACE_ID: jest.fn().mockReturnValue('mockSpaceId'),
  ACCESS_TOKEN: jest.fn().mockReturnValue('mockAccessToken'),
}));

describe('fetchCarouselSlidesFromContentful', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const arrangeContentfulResponseItems = () => [
    {
      sys: { id: '1' },
      fields: {
        headline: 'Priority Slide Headline',
        teaser: 'Priority Slide Teaser',
        image: { sys: { id: 'image1' } },
        linkUrl: 'https://example.com/priority',
        undismissable: true,
        priorityPlacement: true,
      } as Record<string, unknown>,
    },
    {
      sys: { id: '2' },
      fields: {
        headline: 'Regular Slide Headline',
        teaser: 'Regular Slide Teaser',
        image: { sys: { id: 'image2' } },
        linkUrl: 'https://example.com/regular',
        undismissable: false,
        priorityPlacement: false,
      } as Record<string, unknown>,
    },
  ];

  const arrangeContentfulResponseAssets = () => [
    {
      sys: { id: 'image1' },
      fields: { file: { url: '//priority.image.url' } },
    },
    {
      sys: { id: 'image2' },
      fields: { file: { url: '//regular.image.url' } },
    },
  ];

  const arrangeContentfulResponse = (
    items = arrangeContentfulResponseItems(),
    assets = arrangeContentfulResponseAssets(),
  ) => ({
    items,
    includes: { Asset: assets },
  });

  type ContentfulRespoonse = ReturnType<typeof arrangeContentfulResponse>;

  const arrangeMocks = (
    mockContentfulResponse: ContentfulRespoonse | null = arrangeContentfulResponse(),
    mockContentfulAPIResponse: ContentfulRespoonse | null = arrangeContentfulResponse(),
  ) => {
    const mockContentfulClientGetEntries = jest
      .fn()
      .mockResolvedValue(mockContentfulResponse);
    const mockClient = {
      getEntries: mockContentfulClientGetEntries,
    };
    jest
      .mocked(createClient)
      .mockReturnValue(mockClient as unknown as ContentfulClientApi<undefined>);

    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        new Blob([JSON.stringify(mockContentfulAPIResponse)], {
          type: 'application/json',
        }),
        { status: 200 },
      ),
    );

    const mockEnv = {
      SPACE_ID: jest.mocked(SPACE_ID).mockReturnValue('mockSpaceId'),
      ACCESS_TOKEN: jest
        .mocked(ACCESS_TOKEN)
        .mockReturnValue('mockAccessToken'),
    };

    const mockWarning = jest.spyOn(console, 'warn').mockReturnValue();

    return { mockContentfulClientGetEntries, mockFetch, mockEnv, mockWarning };
  };

  it('returns empty arrays if env variables are missing', async () => {
    const { mockEnv, mockWarning } = arrangeMocks();
    mockEnv.SPACE_ID.mockReturnValue(undefined);
    mockEnv.ACCESS_TOKEN.mockReturnValue(undefined);
    const result = await fetchCarouselSlidesFromContentful();

    expect(result).toEqual({ prioritySlides: [], regularSlides: [] });
    expect(mockWarning).toHaveBeenCalledWith(
      'Missing Contentful env variables: FEATURES_ANNOUNCEMENTS_SPACE_ID, FEATURES_ANNOUNCEMENTS_ACCESS_TOKEN.',
    );
  });

  it('fetches slides using the Contentful SDK', async () => {
    const { mockContentfulClientGetEntries, mockFetch } = arrangeMocks();
    await fetchCarouselSlidesFromContentful();
    expect(mockContentfulClientGetEntries).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled(); // Did not fallback to fetch call
  });

  it('falls back to direct fetch if Contentful SDK fails', async () => {
    const { mockContentfulClientGetEntries, mockFetch } = arrangeMocks(
      null,
      arrangeContentfulResponse(),
    );
    await fetchCarouselSlidesFromContentful();
    expect(mockContentfulClientGetEntries).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalled(); // Fallback to fetch call
  });

  it('returns empty arrays if both SDK and fetch fail', async () => {
    const { mockContentfulClientGetEntries, mockFetch } = arrangeMocks(
      null,
      null,
    );
    const result = await fetchCarouselSlidesFromContentful();
    expect(mockContentfulClientGetEntries).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalled();
    expect(result).toStrictEqual({ prioritySlides: [], regularSlides: [] });
  });

  it('correctly maps priority slides and regular slides', async () => {
    const { mockContentfulClientGetEntries } = arrangeMocks();

    const result = await fetchCarouselSlidesFromContentful();

    expect(mockContentfulClientGetEntries).toHaveBeenCalled();
    expect(result.prioritySlides).toHaveLength(1);
    expect(result.prioritySlides[0]).toMatchObject({
      id: 'contentful-1',
      title: 'Priority Slide Headline',
      description: 'Priority Slide Teaser',
      navigation: { type: 'url', href: 'https://example.com/priority' },
      image: 'https://priority.image.url',
      undismissable: true,
    });

    expect(result.regularSlides).toHaveLength(1);
    expect(result.regularSlides[0]).toMatchObject({
      id: 'contentful-2',
      title: 'Regular Slide Headline',
      description: 'Regular Slide Teaser',
      navigation: { type: 'url', href: 'https://example.com/regular' },
      image: 'https://regular.image.url',
      undismissable: false,
    });
  });

  describe('minimum version number', () => {
    const minimumVersionSchema = [
      {
        testName: 'shows banner if minimum version number not added',
        minimumVersion: undefined,
        length: 1,
      },
      {
        testName: 'shows banner if current version matches > version number',
        minimumVersion: '7.55.0',
        length: 1,
      },
      {
        testName: 'shows banner if current version matches === version number',
        minimumVersion: '7.56.0',
        length: 1,
      },
      {
        testName:
          'does not show banner if current version matches < version number ',
        minimumVersion: '7.57.0',
        length: 0,
      },
      {
        testName: 'does not show banner if provided a malformed version number',
        minimumVersion: 'malformed version number',
        length: 0,
      },
    ];

    it.each(minimumVersionSchema)(
      '$testName',
      async ({ minimumVersion, length }) => {
        jest.spyOn(DeviceInfoModule, 'getVersion').mockReturnValue('7.56.0');
        const response = arrangeContentfulResponse();
        response.items[0].fields.mobileMinimumVersionNumber = minimumVersion;
        response.items[1].fields.mobileMinimumVersionNumber = minimumVersion;
        const { mockContentfulClientGetEntries } = arrangeMocks(response);

        const result = await fetchCarouselSlidesFromContentful();

        expect(mockContentfulClientGetEntries).toHaveBeenCalled();
        expect(result.prioritySlides).toHaveLength(length);
        expect(result.regularSlides).toHaveLength(length);
      },
    );
  });
});

describe('isActive', () => {
  const testMatrix = [
    {
      description: 'returns true if slide is active',
      slide: { startDate: '2023-01-01', endDate: '2023-12-31' },
      now: new Date('2023-06-01'),
      expected: true,
    },
    {
      description: 'returns false if slide is not active (before start date)',
      slide: { startDate: '2023-01-01', endDate: '2023-12-31' },
      now: new Date('2022-12-31'),
      expected: false,
    },
    {
      description: 'returns false if slide is not active (after end date)',
      slide: { startDate: '2023-01-01', endDate: '2023-12-31' },
      now: new Date('2024-01-01'),
      expected: false,
    },
    {
      description: 'returns true if no start or end date is provided',
      slide: {},
      now: new Date(),
      expected: true,
    },
  ];

  it.each(testMatrix)('$description', ({ slide, now, expected }) => {
    expect(isActive(slide, now)).toBe(expected);
  });
});
