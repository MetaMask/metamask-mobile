import type { InterestHistoryResponse } from '../../../app/components/UI/Money/types/moneyInterestHistory';
import { moneyHistoricalEarningsResponse } from '../../../app/components/UI/Money/__fixtures__/moneyInterestHistory';
import { restoreFetchPath, stubFetchPath } from './fetchStub';

const MONEY_EARNINGS_PATH =
  '/v1/positions/0x1234567890abcdef1234567890abcdef12345678/interest-history';
const MONEY_EARNINGS_ORIGINS = [
  'https://money.dev-api.cx.metamask.io',
  'https://money.uat-api.cx.metamask.io',
  'https://money.api.cx.metamask.io',
] as const;

interface SetupMoneyEarningsApiMockOptions {
  response?: InterestHistoryResponse | Record<string, unknown>;
  status?: number;
  onRequest?: (url: string) => void;
}

export const setupMoneyEarningsApiMock = ({
  response = moneyHistoricalEarningsResponse,
  status = 200,
  onRequest,
}: SetupMoneyEarningsApiMockOptions = {}): void => {
  MONEY_EARNINGS_ORIGINS.forEach((origin) => {
    stubFetchPath(origin, MONEY_EARNINGS_PATH, response, status, {
      method: 'GET',
      onRequest: ({ url }) => onRequest?.(url),
    });
  });
};

export const clearMoneyEarningsApiMocks = (): void => {
  MONEY_EARNINGS_ORIGINS.forEach((origin) => {
    restoreFetchPath(origin, MONEY_EARNINGS_PATH, { method: 'GET' });
  });
};
