import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  PredictPortfolioServiceActions,
  PredictPortfolioServiceEvents,
} from '../../../components/UI/PredictNext/services/PredictPortfolioService';
import { getPredictPortfolioServiceMessenger } from './predict-portfolio-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  PredictPortfolioServiceActions,
  PredictPortfolioServiceEvents
>;

describe('getPredictPortfolioServiceMessenger', () => {
  it('exposes registered portfolio actions to the root messenger', async () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const serviceMessenger = getPredictPortfolioServiceMessenger(rootMessenger);
    serviceMessenger.registerActionHandler(
      'PredictPortfolioService:getBalance',
      jest.fn().mockResolvedValue('balance'),
    );

    const result = await rootMessenger.call(
      'PredictPortfolioService:getBalance',
      'kalshi' as never,
    );

    expect(result).toBe('balance');
  });
});
