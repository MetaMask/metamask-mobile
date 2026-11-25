import { MockEventsObject } from '../../../framework';
import type { ContentfulBannersResponse } from '../../api-response-types';

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
      } satisfies ContentfulBannersResponse,
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
      } satisfies ContentfulBannersResponse,
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
      } satisfies ContentfulBannersResponse,
    },
  ],
};
