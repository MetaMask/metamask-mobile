import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.ts';
import { KalshiHttpError } from './kalshi/client.ts';
import { toPredictError } from './kalshi/errors.ts';
import { setupRouter } from './routes/setup.ts';
import { readinessRouter } from './routes/readiness.ts';
import { eventsRouter } from './routes/events.ts';
import { portfolioRouter } from './routes/portfolio.ts';
import { ordersRouter } from './routes/orders.ts';
import { fundingRouter } from './routes/funding.ts';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', venue: 'kalshi-demo', baseUrl: config.kalshi.baseUrl });
});

app.use('/predict/v1/kalshi/account/setup', setupRouter);
app.use('/predict/v1/kalshi/account/readiness', readinessRouter);
app.use('/predict/v1/kalshi/events', eventsRouter);
app.use('/predict/v1/kalshi/markets', eventsRouter); // /markets/:id/prices
app.use('/predict/v1/kalshi/portfolio', portfolioRouter);
app.use('/predict/v1/kalshi/orders', ordersRouter);
app.use('/predict/v1/kalshi/funding', fundingRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof KalshiHttpError) {
    res.status(err.status).json(
      toPredictError(mapKalshiCodeToPredictCode(err.body.code), err.body.message, err.body),
    );
    return;
  }
  const message = err instanceof Error ? err.message : 'internal_error';
  // eslint-disable-next-line no-console
  console.error('[backend]', err);
  res.status(500).json(toPredictError('UNKNOWN_ERROR', message));
});

function mapKalshiCodeToPredictCode(code: string): string {
  switch (code) {
    case 'account_exists':
      return 'ACCOUNT_EXISTS';
    case 'invalid_phone_number':
      return 'INVALID_PARAMETERS';
    case 'invalid_parameters':
      return 'INVALID_PARAMETERS';
    case 'invalid_or_expired_code':
      return 'INVALID_OR_EXPIRED_CODE';
    case 'user_is_not_kyc-approved':
      return 'KYC_PENDING';
    case 'authentication_error':
      return 'VENUE_UNAUTHENTICATED';
    case 'permission_denied':
      return 'VENUE_PERMISSION_DENIED';
    case 'payout_method_invalid':
      return 'PAYOUT_METHOD_INVALID';
    case 'payment_failed':
      return 'PAYMENT_FAILED';
    case 'non_positive_transfer_amount':
      return 'INVALID_PARAMETERS';
    case 'not_found':
      return 'NOT_FOUND';
    case 'too_many_requests':
      return 'RATE_LIMITED';
    case 'try_logging_in,_user_already_exists':
      return 'EXTERNAL_USER_ID_TAKEN';
    default:
      return 'VENUE_ERROR';
  }
}

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[backend] kalshi-poc-backend listening on http://localhost:${config.port}`,
  );
  // eslint-disable-next-line no-console
  console.log(`[backend] proxying Kalshi at ${config.kalshi.baseUrl}`);
});
