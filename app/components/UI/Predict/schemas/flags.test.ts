import { create, StructError } from '@metamask/superstruct';
import {
  PredictFeeCollectionSchema,
  PredictFeedBannerSchema,
  PredictFeedCarouselSchema,
  PredictHiddenMarketsSchema,
  PredictSportsFeedSchema,
} from './flags';
import {
  DEFAULT_FEE_COLLECTION_FLAG,
  DEFAULT_HIDDEN_MARKETS_FLAG,
  DEFAULT_PREDICT_SPORTS_FEED_FLAG,
  DEFAULT_PREDICT_FEED_BANNER_FLAG,
  DEFAULT_PREDICT_FEED_CAROUSEL_FLAG,
} from '../constants/flags';
import {
  PredictFeedBannerPosition,
  PredictFeedBannerSeverity,
} from '../constants/feedBanner';

describe('PredictFeedCarouselSchema', () => {
  const validFlag = {
    enabled: true,
    minimumVersion: '1.0.0',
    mode: 'custom',
    title: 'Wimbledon',
    deeplink: 'https://link.metamask.io/predict?feed=sports&tab=tennis',
    contentSource: {
      composition: 'query-results',
      queryParams: 'tag_slug=tennis&title_search=Wimbledon',
      excludedMarketIds: ['market-1'],
    },
  };

  it('returns live defaults when input is undefined', () => {
    const result = create(undefined, PredictFeedCarouselSchema);

    expect(result).toStrictEqual(DEFAULT_PREDICT_FEED_CAROUSEL_FLAG);
  });

  it('preserves a custom config and tolerates future fields', () => {
    const result = create(
      { ...validFlag, futureRemoteField: 'ignored' },
      PredictFeedCarouselSchema,
    );

    expect(result).toStrictEqual({
      ...validFlag,
      futureRemoteField: 'ignored',
    });
  });

  it('defaults an omitted content source to top-market query behavior', () => {
    const { contentSource } = create(
      {
        enabled: true,
        minimumVersion: '1.0.0',
        mode: 'custom',
        title: 'Top markets',
      },
      PredictFeedCarouselSchema,
    );

    expect(contentSource).toStrictEqual({
      composition: 'query-results',
      queryParams: '',
      excludedMarketIds: [],
    });
  });

  it.each([
    ['mode', 'automatic'],
    ['minimumVersion', 'not-semver'],
    ['title', 123],
    ['deeplink', false],
  ])('throws for unsupported %s value', (field, value) => {
    const input = { ...validFlag, [field]: value };

    expect(() => create(input, PredictFeedCarouselSchema)).toThrow(StructError);
  });

  it.each([
    ['composition', 'automatic'],
    ['queryParams', ['tag_slug=tennis']],
    ['excludedMarketIds', ['market-1', 2]],
  ])('throws for unsupported content source %s', (field, value) => {
    const input = {
      ...validFlag,
      contentSource: { ...validFlag.contentSource, [field]: value },
    };

    expect(() => create(input, PredictFeedCarouselSchema)).toThrow(StructError);
  });
});

describe('PredictHiddenMarketsSchema', () => {
  const validFlag = {
    enabled: true,
    minimumVersion: '1.0.0',
    hidden: [
      {
        category: 'ending-soon',
        marketIds: ['event-1'],
        slugs: ['guinea-bissau-election'],
      },
    ],
  };

  it('returns disabled defaults when input is undefined', () => {
    const result = create(undefined, PredictHiddenMarketsSchema);

    expect(result).toStrictEqual(DEFAULT_HIDDEN_MARKETS_FLAG);
  });

  it('preserves a valid config and tolerates future fields', () => {
    const result = create(
      { ...validFlag, futureRemoteField: 'ignored' },
      PredictHiddenMarketsSchema,
    );

    expect(result).toStrictEqual({
      ...validFlag,
      futureRemoteField: 'ignored',
    });
  });

  it('defaults omitted entry arrays to empty lists', () => {
    const result = create(
      {
        enabled: true,
        minimumVersion: '1.0.0',
        hidden: [{ category: 'ending-soon' }],
      },
      PredictHiddenMarketsSchema,
    );

    expect(result.hidden).toStrictEqual([
      { category: 'ending-soon', marketIds: [], slugs: [] },
    ]);
  });

  it.each([
    ['minimumVersion', 'not-semver'],
    ['hidden', 'not-an-array'],
  ])('throws for unsupported %s value', (field, value) => {
    const input = { ...validFlag, [field]: value };

    expect(() => create(input, PredictHiddenMarketsSchema)).toThrow(
      StructError,
    );
  });

  it.each([
    ['category', 123],
    ['marketIds', ['event-1', 2]],
    ['slugs', 'guinea-bissau-election'],
  ])('throws for unsupported entry %s value', (field, value) => {
    const input = {
      ...validFlag,
      hidden: [{ ...validFlag.hidden[0], [field]: value }],
    };

    expect(() => create(input, PredictHiddenMarketsSchema)).toThrow(
      StructError,
    );
  });
});

describe('PredictFeedBannerSchema', () => {
  const validFlag = {
    enabled: true,
    minimumVersion: '1.0.0',
    id: 'predict-incident-1',
    title: 'Service update',
    description: 'Predict markets are temporarily unavailable.',
    position: PredictFeedBannerPosition.AfterFeaturedCarousel,
    severity: PredictFeedBannerSeverity.Warning,
    dismissible: true,
  };

  it('returns safe disabled defaults when input is undefined', () => {
    const result = create(undefined, PredictFeedBannerSchema);

    expect(result).toStrictEqual(DEFAULT_PREDICT_FEED_BANNER_FLAG);
  });

  it('preserves a valid remote banner and tolerates future fields', () => {
    const result = create(
      { ...validFlag, futureRemoteField: 'ignored' },
      PredictFeedBannerSchema,
    );

    expect(result).toStrictEqual({
      ...validFlag,
      futureRemoteField: 'ignored',
    });
  });

  it.each([
    ['position', 'between-everything'],
    ['severity', 'critical'],
    ['dismissible', 'yes'],
  ])('throws for invalid %s', (field, value) => {
    const input = { ...validFlag, [field]: value };

    expect(() => create(input, PredictFeedBannerSchema)).toThrow(StructError);
  });
});

describe('PredictFeeCollectionSchema', () => {
  describe('defaults', () => {
    it('returns all defaults when input is undefined', () => {
      const result = create(undefined, PredictFeeCollectionSchema);

      expect(result).toStrictEqual(DEFAULT_FEE_COLLECTION_FLAG);
    });

    it('returns all defaults when input is an empty object', () => {
      const result = create({}, PredictFeeCollectionSchema);

      expect(result).toStrictEqual(DEFAULT_FEE_COLLECTION_FLAG);
    });

    it('fills missing fields with defaults', () => {
      const input = { enabled: false };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.enabled).toBe(false);
      expect(result.collector).toBe(DEFAULT_FEE_COLLECTION_FLAG.collector);
      expect(result.metamaskFee).toBe(DEFAULT_FEE_COLLECTION_FLAG.metamaskFee);
      expect(result.providerFee).toBe(DEFAULT_FEE_COLLECTION_FLAG.providerFee);
      expect(result.waiveList).toStrictEqual(
        DEFAULT_FEE_COLLECTION_FLAG.waiveList,
      );
      expect(result.executors).toStrictEqual(
        DEFAULT_FEE_COLLECTION_FLAG.executors,
      );
      expect(result.permit2Enabled).toBe(
        DEFAULT_FEE_COLLECTION_FLAG.permit2Enabled,
      );
    });
  });

  describe('valid inputs', () => {
    it('preserves all provided fields', () => {
      const input = {
        enabled: false,
        collector: '0x1234567890abcdef1234567890abcdef12345678',
        metamaskFee: 0.05,
        providerFee: 0.03,
        waiveList: ['0xaaa', '0xbbb'],
        executors: ['0xccc'],
        permit2Enabled: true,
      };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result).toStrictEqual(input);
    });

    it('preserves enabled=false override', () => {
      const input = { enabled: false };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.enabled).toBe(false);
    });

    it('preserves custom collector address', () => {
      const input = {
        collector: '0x0000000000000000000000000000000000000001',
      };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.collector).toBe(
        '0x0000000000000000000000000000000000000001',
      );
    });

    it('preserves custom fee values', () => {
      const input = { metamaskFee: 0.1, providerFee: 0 };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.metamaskFee).toBe(0.1);
      expect(result.providerFee).toBe(0);
    });

    it('preserves non-empty waiveList', () => {
      const input = { waiveList: ['0xaaa', '0xbbb'] };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.waiveList).toStrictEqual(['0xaaa', '0xbbb']);
    });

    it('preserves non-empty executors list', () => {
      const input = { executors: ['0xexec1', '0xexec2'] };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.executors).toStrictEqual(['0xexec1', '0xexec2']);
    });

    it('preserves permit2Enabled=true override', () => {
      const input = { permit2Enabled: true };

      const result = create(input, PredictFeeCollectionSchema);

      expect(result.permit2Enabled).toBe(true);
    });
  });

  describe('type validation', () => {
    it('throws for non-boolean enabled field', () => {
      const input = { enabled: 'yes' };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for non-string collector field', () => {
      const input = { collector: 12345 };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for non-number metamaskFee field', () => {
      const input = { metamaskFee: '0.02' };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for non-number providerFee field', () => {
      const input = { providerFee: true };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for non-array waiveList field', () => {
      const input = { waiveList: 'not-an-array' };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for non-array executors field', () => {
      const input = { executors: 42 };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for non-boolean permit2Enabled field', () => {
      const input = { permit2Enabled: 'true' };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });

    it('throws for collector without 0x prefix', () => {
      const input = { collector: 'not-a-hex-address' };

      expect(() => create(input, PredictFeeCollectionSchema)).toThrow(
        StructError,
      );
    });
  });
});

describe('PredictSportsFeedSchema', () => {
  it('returns bundled sports config defaults when input is undefined', () => {
    const result = create(undefined, PredictSportsFeedSchema);

    expect(result).toStrictEqual(DEFAULT_PREDICT_SPORTS_FEED_FLAG);
  });

  it('preserves configured sports tabs and applies default games tag id', () => {
    const input = {
      enabled: true,
      minimumVersion: '1.0.0',
      tabs: [
        {
          id: 'soccer',
          titleKey: 'predict.feed.tabs.soccer',
          label: 'Soccer',
          tagSlug: 'soccer',
          chips: [
            {
              id: 'games',
              kind: 'games',
              titleKey: 'predict.feed.filters.games',
              filterByVolume: 1000,
            },
            {
              id: 'mls',
              kind: 'tag',
              titleKey: 'predict.feed.filters.mls',
              tagSlug: 'mls',
              order: 'volume',
              startTimeMinMinutesAgo: 45,
              queryParams:
                'active=true&closed=false&tag_slug=custom-mls&order=startTime&ascending=true',
            },
            {
              id: 'props',
              kind: 'props',
              startTimeMinMinutesAgo: null,
            },
          ],
        },
      ],
    };

    const result = create(input, PredictSportsFeedSchema);

    expect(result).toStrictEqual(input);
  });

  it('sets filterByVolume on the default All games chip only', () => {
    const allGamesChip = DEFAULT_PREDICT_SPORTS_FEED_FLAG.tabs
      .find((tab) => tab.id === 'all')
      ?.chips.find((chip) => chip.id === 'games');
    const soccerGamesChip = DEFAULT_PREDICT_SPORTS_FEED_FLAG.tabs
      .find((tab) => tab.id === 'soccer')
      ?.chips.find((chip) => chip.id === 'games');

    expect(allGamesChip?.filterByVolume).toBe(1000);
    expect(soccerGamesChip?.filterByVolume).toBeUndefined();
  });

  it('tolerates unknown keys in the remote payload', () => {
    const result = create(
      {
        enabled: true,
        minimumVersion: '1.0.0',
        tabs: [],
        someFutureField: 'ignored',
      },
      PredictSportsFeedSchema,
    );

    expect(result.enabled).toBe(true);
    expect(result.tabs).toEqual([]);
  });

  it('throws for invalid tab entries', () => {
    expect(() =>
      create(
        {
          tabs: [{ titleKey: 'predict.feed.tabs.soccer', chips: [] }],
        },
        PredictSportsFeedSchema,
      ),
    ).toThrow(StructError);
  });

  it('throws for invalid chip order values', () => {
    expect(() =>
      create(
        {
          tabs: [
            {
              id: 'soccer',
              chips: [
                {
                  id: 'games',
                  kind: 'games',
                  order: 'unsupported',
                },
              ],
            },
          ],
        },
        PredictSportsFeedSchema,
      ),
    ).toThrow(StructError);
  });
});
