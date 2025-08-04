import { CaipAccountId } from '@metamask/utils';
import { TestSpecificMock } from '../../framework/types';

/**
 * Mock responses for cardholder API calls
 * Used in E2E tests to avoid dependency on external APIs
 */

/**
 * Get cardholder API mocks with realistic responses
 * @returns {CardholderApiMocks} Object containing GET mocks for cardholder APIs
 */
export const getCardholderApiMocks = (
  caipAccountAddresses: CaipAccountId[],
  cardholderAddresses?: CaipAccountId[],
): TestSpecificMock => {
  const url = new URL('v1/metadata', 'https://accounts.api.cx.metamask.io');
  url.searchParams.set(
    'accountIds',
    caipAccountAddresses.join(',').toLowerCase(),
  );
  url.searchParams.set('label', 'card_user');

  return {
    GET: [
      {
        urlEndpoint: url.toString(),
        response: {
          is: cardholderAddresses || caipAccountAddresses,
        },
        responseCode: 200,
      },
    ],
  };
};
