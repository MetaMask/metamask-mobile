import { MockEventsObject } from '../../../framework';

export const CONTENTFUL_BANNERS_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /https:\/\/cdn\.contentful\.com.*content_type=promotionalBanner/,
      responseCode: 200,
      response: {
        sys: {
          type: 'Array',
        },
        total: 0,
        skip: 0,
        limit: 100,
        items: [],
        includes: {
          Asset: [],
        },
      },
    },
    {
      urlEndpoint: /contentful\.com.*promotionalBanner/,
      responseCode: 200,
      response: {
        sys: {
          type: 'Array',
        },
        total: 0,
        skip: 0,
        limit: 100,
        items: [],
        includes: {
          Asset: [],
        },
      },
    },
    {
      urlEndpoint: /contentful\.com.*showInMobile.*true/,
      responseCode: 200,
      response: {
        sys: {
          type: 'Array',
        },
        total: 0,
        skip: 0,
        limit: 100,
        items: [],
        includes: {
          Asset: [],
        },
      },
    },
  ],
};
