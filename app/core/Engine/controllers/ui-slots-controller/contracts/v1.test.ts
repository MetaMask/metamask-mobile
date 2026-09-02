import { MOBILE_UI_SLOTS_CONTRACT_REGISTRY } from '../../../../../components/UI/UiSlots/mobileContractRegistry';
import { parseUiSlotsResponse } from './v1';

const makeResponse = (slots: unknown[]) => ({
  contractVersion: 1,
  configurationVersion: 'config-1',
  screenId: 'wallet-home',
  locale: 'en',
  publishedAt: '2026-09-02T10:00:00.000Z',
  ignoredEnvelopeField: true,
  slots,
});

const validDiscovery = {
  slotId: 'wallet-home.predict-empty-state',
  contentId: 'predict-empty-state-1',
  revision: 1,
  ignoredSlotField: true,
  widget: {
    type: 'predict-discovery-list',
    schemaVersion: 1,
    props: {},
  },
  dataReferences: [
    {
      id: 'markets',
      type: 'predict-homepage-market-slots',
      params: {
        venue: 'polymarket',
        items: [
          {
            type: 'series',
            seriesId: 'btc-up-or-down-5m',
          },
        ],
      },
    },
  ],
};

describe('parseUiSlotsResponse', () => {
  it('rejects responses above the slot-count bound', () => {
    const slots = Array.from({ length: 21 }, (_, index) => ({
      ...validDiscovery,
      slotId: `wallet-home.slot-${index}`,
      contentId: `content-${index}`,
    }));

    expect(() =>
      parseUiSlotsResponse(
        makeResponse(slots),
        MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
      ),
    ).toThrow('invalid-slot-structure');
  });

  it('strips additive envelope and slot fields', () => {
    const { response } = parseUiSlotsResponse(
      makeResponse([validDiscovery]),
      MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
    );

    expect(response).not.toHaveProperty('ignoredEnvelopeField');
    expect(response.slots[0]).not.toHaveProperty('ignoredSlotField');
  });

  it('rejects one malformed slot without invalidating valid slots', () => {
    const parsed = parseUiSlotsResponse(
      makeResponse([
        validDiscovery,
        {
          ...validDiscovery,
          slotId: 'wallet-home.unknown',
          contentId: 'unknown-1',
          widget: { type: 'unknown-widget', schemaVersion: 1, props: {} },
        },
      ]),
      MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
    );

    expect(parsed.response.slots).toHaveLength(1);
    expect(parsed.rejections).toEqual([{ index: 1, code: 'unknown-widget' }]);
  });

  it('parses the Predict homepage market slots reference', () => {
    const { response } = parseUiSlotsResponse(
      makeResponse([validDiscovery]),
      MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
    );

    expect(response.slots[0].dataReferences?.[0]).toEqual(
      validDiscovery.dataReferences[0],
    );
  });

  it('publishes an empty configuration for an unsupported venue', () => {
    const parsed = parseUiSlotsResponse(
      makeResponse([
        {
          ...validDiscovery,
          dataReferences: [
            {
              ...validDiscovery.dataReferences[0],
              params: {
                ...validDiscovery.dataReferences[0].params,
                venue: 'unknown-venue',
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

  it('rejects duplicate data reference IDs', () => {
    const parsed = parseUiSlotsResponse(
      makeResponse([
        {
          ...validDiscovery,
          dataReferences: [
            validDiscovery.dataReferences[0],
            validDiscovery.dataReferences[0],
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

  it('rejects slots above the data-reference-count bound', () => {
    const parsed = parseUiSlotsResponse(
      makeResponse([
        {
          ...validDiscovery,
          dataReferences: Array.from(
            { length: 11 },
            () => validDiscovery.dataReferences[0],
          ),
        },
      ]),
      MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
    );

    expect(parsed.response.slots).toEqual([]);
    expect(parsed.rejections).toEqual([
      { index: 0, code: 'invalid-data-reference' },
    ]);
  });

  it.each([undefined, true])(
    'rejects remote actions when required is %s',
    (required) => {
      const parsed = parseUiSlotsResponse(
        makeResponse([
          {
            ...validDiscovery,
            actions: [
              {
                actionId: 'future-action',
                trigger: 'press',
                params: {},
                required,
              },
            ],
          },
        ]),
        MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
      );

      expect(parsed.response.slots).toEqual([]);
      expect(parsed.rejections).toEqual([{ index: 0, code: 'invalid-action' }]);
    },
  );

  it.each(['slotId', 'contentId', 'revision'] as const)(
    'rejects the complete response when %s is missing',
    (field) => {
      expect(() =>
        parseUiSlotsResponse(
          makeResponse([{ ...validDiscovery, [field]: undefined }]),
          MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
        ),
      ).toThrow('invalid-slot-structure');
    },
  );

  it('rejects duplicate slot IDs before filtering an incompatible widget', () => {
    expect(() =>
      parseUiSlotsResponse(
        makeResponse([
          validDiscovery,
          {
            ...validDiscovery,
            contentId: 'predict-empty-state-2',
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
    ['slotId', 'wallet-home.predict-empty-state', 'duplicate-slot-id'],
    ['contentId', 'predict-empty-state-1', 'duplicate-content-id'],
  ] as const)(
    'rejects duplicate %s values as a structural invariant',
    (field, value, expectedCode) => {
      expect(() =>
        parseUiSlotsResponse(
          makeResponse([
            validDiscovery,
            {
              ...validDiscovery,
              slotId: 'wallet-home.other',
              contentId: 'predict-empty-state-2',
              [field]: value,
            },
          ]),
          MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
        ),
      ).toThrow(expectedCode);
    },
  );
});
