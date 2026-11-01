import '../../../../../tests/component-view/mocks';
import { HttpError } from '@metamask/controller-utils';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderScreenWithRoutes } from '../../../../../tests/component-view/render';
import { initialStateVba } from '../../../../../tests/component-view/presets/vba';
import { VbaOnboardingRoutes } from '../../Ramp/Views/VirtualBankAccount/routes';
import VbaEmailAdapter, { VbaEmailAdapterSelectorsIDs } from './EmailAdapter';

const RAW_URL = 'https://kyc.example/sessions/latest/status/iron';
const RAW_STATUS = "failed with status '500'";

// `KycService` HttpError message for a failed `GET /sessions/latest/status/iron`.
const kycHttpError = (status: number) =>
  new HttpError(status, `Fetching '${RAW_URL}' ${RAW_STATUS}`);

const kyc = Engine.context.KycController as unknown as {
  getSessionStatusForVendor?: jest.Mock;
};

const renderVbaEmailAdapter = () =>
  renderScreenWithRoutes(
    VbaEmailAdapter,
    { name: VbaOnboardingRoutes.EMAIL },
    [],
    { state: initialStateVba().build() },
  );

describeForPlatforms('VBA email verification view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    kyc.getSessionStatusForVendor = jest
      .fn()
      .mockRejectedValue(kycHttpError(500));
  });

  afterEach(() => {
    delete kyc.getSessionStatusForVendor;
  });

  it('shows a generic message instead of the raw KYC HTTP error', async () => {
    const { findByTestId } = renderVbaEmailAdapter();

    const message = await findByTestId(
      VbaEmailAdapterSelectorsIDs.ERROR_MESSAGE,
    );

    expect(message).toHaveTextContent(
      strings('virtual_bank_account.kyc_email.http_error'),
    );
    expect(message).not.toHaveTextContent(RAW_URL, { exact: false });
    expect(message).not.toHaveTextContent(RAW_STATUS, { exact: false });
  });
});
