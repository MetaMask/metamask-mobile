import walletHomeFixture from './screens/wallet-home.json';
import type { Json } from '@metamask/utils';
import {
  UiSlotsHttpError,
  type FetchUiSlotsScreenRequest,
  type FetchUiSlotsScreenResult,
  type UiSlotsReadTransport,
} from '../UiSlotsApiReadClient';

const MOCK_LATENCY_MS = 250;

const wait = (signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, MOCK_LATENCY_MS);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        const error = new Error('The request was aborted.');
        error.name = 'AbortError';
        reject(error);
      },
      { once: true },
    );
  });

export class UiSlotsMockTransport implements UiSlotsReadTransport {
  async fetchScreen({
    screenId,
    locale,
    etag,
    signal,
  }: FetchUiSlotsScreenRequest): Promise<FetchUiSlotsScreenResult> {
    await wait(signal);

    switch (process.env.MM_UI_SLOTS_MOCK_FAILURE) {
      case 'network':
        throw new TypeError('Mock UI Slots network failure.');
      case '500':
        throw new UiSlotsHttpError(500);
      case 'malformed':
        return {
          status: 'modified',
          value: { contractVersion: 1, slots: 'invalid' },
        };
      default:
        break;
    }

    if (screenId !== 'wallet-home') {
      throw new UiSlotsHttpError(404);
    }

    const localizedFixture = {
      ...walletHomeFixture,
      locale,
    };
    const currentEtag = `"${walletHomeFixture.configurationVersion}"`;

    if (etag === currentEtag) {
      return {
        status: 'not-modified',
        etag: currentEtag,
      };
    }

    return {
      status: 'modified',
      etag: currentEtag,
      value: localizedFixture as unknown as Json,
    };
  }
}
