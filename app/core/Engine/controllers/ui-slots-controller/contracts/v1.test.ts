import { parseUiSlotsResponse } from './v1';
import { MOBILE_UI_SLOTS_CONTRACT_REGISTRY } from '../../../../../components/UI/UiSlots/mobileContractRegistry';

const makeResponse = (slots: unknown[]) => ({
  contractVersion: 1,
  configurationVersion: 'config-1',
  screenId: 'predict-home',
  locale: 'en',
  publishedAt: '2026-08-13T10:00:00.000Z',
  ignoredEnvelopeField: true,
  slots,
});

const validBanner = {
  slotId: 'predict-home.before-portfolio',
  contentId: 'banner-1',
  revision: 1,
  ignoredSlotField: true,
  widget: {
    type: 'alert-banner',
    schemaVersion: 1,
    ignoredWidgetField: true,
    props: {
      tone: 'info',
      title: 'Title',
      description: 'Description',
      ignoredProp: true,
    },
  },
};

const validMarketCarousel = {
  slotId: 'predict-home.live-now',
  contentId: 'carousel-1',
  revision: 1,
  widget: {
    type: 'market-carousel',
    schemaVersion: 1,
    props: {},
  },
  dataReferences: [
    {
      id: 'markets',
      type: 'predict-feed',
      params: {
        venue: 'polymarket',
        feedId: 'popular-open',
      },
    },
  ],
};

describe('parseUiSlotsResponse', () => {
  it('strips additive unknown fields', () => {
    const { response } = parseUiSlotsResponse(
      makeResponse([validBanner]),
      MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
    );

    expect(response).not.toHaveProperty('ignoredEnvelopeField');
    expect(response.slots[0]).not.toHaveProperty('ignoredSlotField');
    expect(response.slots[0].widget).not.toHaveProperty('ignoredWidgetField');
    expect(response.slots[0].widget.props).not.toHaveProperty('ignoredProp');
  });

  it('rejects one malformed slot without invalidating valid slots', () => {
    const parsed = parseUiSlotsResponse(
      makeResponse([
        validBanner,
        {
          ...validBanner,
          slotId: 'predict-home.after-portfolio',
          contentId: 'unknown-1',
          widget: { type: 'unknown-widget', schemaVersion: 1, props: {} },
        },
      ]),
      MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
    );

    expect(parsed.response.slots).toHaveLength(1);
    expect(parsed.rejectedSlotCount).toBe(1);
    expect(parsed.rejections).toEqual([{ index: 1, code: 'unknown-widget' }]);
  });

  it('parses a feature-owned venue-qualified feed reference', () => {
    const { response } = parseUiSlotsResponse(
      makeResponse([validMarketCarousel]),
      MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
    );

    expect(response.slots[0].dataReferences?.[0]).toEqual(
      validMarketCarousel.dataReferences[0],
    );
  });

  it('publishes an empty configuration for an unknown feed reference', () => {
    const parsed = parseUiSlotsResponse(
      makeResponse([
        {
          ...validMarketCarousel,
          dataReferences: [
            {
              ...validMarketCarousel.dataReferences[0],
              params: {
                ...validMarketCarousel.dataReferences[0].params,
                feedId: 'future-feed',
              },
            },
          ],
        },
      ]),
      MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
    );

    expect(parsed.response.slots).toEqual([]);
    expect(parsed.rejections).toEqual([
      { index: 0, code: 'invalid-data-reference' },
    ]);
  });

  it('rejects an unsupported Predict venue with a reason code', () => {
    const parsed = parseUiSlotsResponse(
      makeResponse([
        validBanner,
        {
          ...validMarketCarousel,
          dataReferences: [
            {
              ...validMarketCarousel.dataReferences[0],
              params: {
                ...validMarketCarousel.dataReferences[0].params,
                venue: 'unknown-venue',
              },
            },
          ],
        },
      ]),
      MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
    );

    expect(parsed.response.slots).toHaveLength(1);
    expect(parsed.rejections).toEqual([
      { index: 1, code: 'invalid-data-reference' },
    ]);
  });

  it('removes an unknown optional action without rejecting the slot', () => {
    const parsed = parseUiSlotsResponse(
      makeResponse([
        {
          ...validBanner,
          actions: [
            {
              actionId: 'future-action',
              trigger: 'press',
              params: {},
            },
          ],
        },
      ]),
      MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
    );

    expect(parsed.response.slots[0].actions).toEqual([]);
    expect(parsed.rejectedSlotCount).toBe(0);
  });

  it('publishes an empty configuration for an unknown required action', () => {
    const parsed = parseUiSlotsResponse(
      makeResponse([
        {
          ...validBanner,
          actions: [
            {
              actionId: 'future-action',
              trigger: 'press',
              params: {},
              required: true,
            },
          ],
        },
      ]),
      MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
    );

    expect(parsed.response.slots).toEqual([]);
    expect(parsed.rejections).toEqual([
      { index: 0, code: 'unknown-required-action' },
    ]);
  });

  it('publishes an empty configuration when every slot is incompatible', () => {
    const parsed = parseUiSlotsResponse(
      makeResponse([
        {
          ...validBanner,
          widget: { type: 'unknown-widget', schemaVersion: 1, props: {} },
        },
      ]),
      MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
    );

    expect(parsed.response.slots).toEqual([]);
    expect(parsed.rejections).toEqual([{ index: 0, code: 'unknown-widget' }]);
  });

  it.each(['slotId', 'contentId', 'revision'] as const)(
    'rejects the complete response when %s is missing',
    (field) => {
      expect(() =>
        parseUiSlotsResponse(
          makeResponse([{ ...validBanner, [field]: undefined }]),
          MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
        ),
      ).toThrow('invalid-slot-structure');
    },
  );

  it('rejects duplicate slot IDs before filtering an incompatible widget', () => {
    expect(() =>
      parseUiSlotsResponse(
        makeResponse([
          validBanner,
          {
            ...validBanner,
            contentId: 'banner-2',
            widget: {
              type: 'unknown-widget',
              schemaVersion: 1,
              props: {},
            },
          },
        ]),
        MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
      ),
    ).toThrow('duplicate-slot-id');
  });

  it.each([
    ['slotId', 'predict-home.before-portfolio', 'duplicate-slot-id'],
    ['contentId', 'banner-1', 'duplicate-content-id'],
  ] as const)(
    'rejects duplicate %s values as a structural invariant',
    (field, value, expectedCode) => {
      expect(() =>
        parseUiSlotsResponse(
          makeResponse([
            validBanner,
            {
              ...validBanner,
              slotId: 'predict-home.after-portfolio',
              contentId: 'banner-2',
              [field]: value,
            },
          ]),
          MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
        ),
      ).toThrow(expectedCode);
    },
  );
});
