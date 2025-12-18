import { MockEventsObject } from '../../../framework';
import { RampsRegions, RampsRegionsEnum } from '../../../framework/Constants';
import { RAMPS_NETWORKS_RESPONSE } from '../ramps/ramps-mocks';
import { createGeolocationResponse } from '../ramps/ramps-geolocation';

/**
 * Mock data for on-ramp API endpoints used in E2E testing.
 * Covers geolocation and network information.
 * Can be overriden by testSpecificMock
 */

export const DEFAULT_RAMPS_API_MOCKS: MockEventsObject = {
  GET: [
    ...createGeolocationResponse(RampsRegions[RampsRegionsEnum.UNITED_STATES]),
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.dev-api\.cx\.metamask\.io\/regions\/networks/,
      responseCode: 200,
      response: RAMPS_NETWORKS_RESPONSE,
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.api\.cx\.metamask\.io\/regions\/networks\?.*$/,
      responseCode: 200,
      response: RAMPS_NETWORKS_RESPONSE,
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/regions\/networks\?.*$/,
      responseCode: 200,
      response: RAMPS_NETWORKS_RESPONSE,
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.uat-api\.cx\.metamask\.io\/providers\/banxa-staging\/buy-widget\?.*$/,
      responseCode: 200,
      response: {
        url: 'https://metamask.banxa-sandbox.com/papi/transit/?initId=eyJpdiI6ImtlOGdjdE1BZHA2Y1UrbW9KMVNGUUE9PSIsInZhbHVlIjoiUG5BOVozdk4vN24zZ3k0dVMwZUVjay9oU1FOQmkvdGFUN2hQb0tMWUdVRit3MnowK001VS9SVERzY09Zano0RnhBMk1FS292ckI4YlRGZGNsSzl2Sk5ycnRpRnVSUUJBOWZyZjVHcjN6cG9lV0N3SnhCY2RBTUZnNWRZa3AvNUd1d0NHaFRxd0RDN1lYUlhMVXBnenh0QkFZcEppaHEzakFuTHlGTTJyazVUT3lIVUNSMno4TjhKVUQxWkFjZlZ0SnJzcjZQZ1d2YXdPK1B6WkU0NUxvcGZWaXhzeWpXbXlCdUZsN1UzbC9nemN1N0pVTEE3U3Q4MkJSeEVHS1p2cmtPblU0Zkl4QWIzamVBWVJCOFY2bHcxZnhnb0VoL2RIOGxVTDYrUThtUEdXbGxCc00yY1U4SWx4MmNlc3NtV0NoSXlpL0xKUVZmTEVtMWt5WWZlZUIxNHFRTGJGdGkrRU5XeWh0UHl4VXRNaFcwQUM5U3NRdm0wZDR4aHFJM2Z0amJYR3Mya0xNVUdiOE10RmJ3c0lhcHEvc3Z0ZVkwdm0wUUlkdDRXMDQ0NERQZnpGd2NRTUFWQ285YmRmUFhSWWlvY01aWlJJaEJCZEM3ZjE4cHpSa25WQzdiVjh4OWIxVHUycHM2SFNFV3Z6cndyalNjc0szcnN4VldqVnFVdkJDYjFBL3RyMTJ3enNUSWUzZUlUUGVXNS9GL0Mzb1FGWk5OZFZaYmtDdDM4PSIsIm1hYyI6ImExM2YzODc1YjEzNDkzOTJjZTAxZDA0MzA4YWEzYWY5NjVlZWFhYTlkYzFlMmRlYjllMjkwM2FlNGUyMjM4MjAiLCJ0YWciOiIifQ==',
        browser: 'APP_BROWSER',
        orderId: null,
      },
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp-content\.uat-api\.cx\.metamask\.io\/regions\/countries(\/.*)?$/,
      responseCode: 200,
      response: [],
    },
  ],
};
