import '../../../../../../tests/component-view/mocks';
import { HttpError } from '@metamask/controller-utils';
import type { KycSessionStatus } from '@metamask/kyc-controller';
import Engine from '../../../../../core/Engine';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderVbaOnboardingLoading,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import { CreateVirtualBankAccountSelectorsIDs } from './CreateVirtualBankAccount.testIds';

// `SessionStatusResponseStruct` (`kyc-controller` `KycService.js`).
const STORED_SESSION: KycSessionStatus = {
  id: 'session-1',
  externalUserId: 'user-1',
  vendor: 'sumsub',
  vendorStatus: 'pending',
  finalStatus: 'pending',
  kycStatus: 'pending',
};

// What `hydrateVbaOnboarding` returns after a 404 clears the session
// (`RampsController.js` empty snapshot).
const EMPTY_AFTER_NOT_FOUND = {
  sessionExists: false,
  vendorDisclaimersComplete: false,
  sessionDisclaimersComplete: false,
  providerFlowStatus: 'not_started' as const,
  kycStatus: 'none' as const,
  autorampStatus: 'not_ready' as const,
};

const kyc = Engine.context.KycController as unknown as {
  readSessionStatus: jest.Mock;
  startSession: jest.Mock;
  fetchVendorDisclaimers: jest.Mock;
  clearState: jest.Mock;
};

// The shared Engine mock has no `clearState`. The 404 resume path calls it.
kyc.clearState = jest.fn();

const hydrate = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);

describeForPlatforms('VBA cold entry session status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    kyc.readSessionStatus.mockReturnValue(STORED_SESSION);
    kyc.fetchVendorDisclaimers.mockResolvedValue([]);
    kyc.startSession.mockRejectedValue(
      new HttpError(
        404,
        "Fetching 'https://kyc.example/sessions/session-1/status' failed with status '404'",
      ),
    );
    hydrate.mockResolvedValue(EMPTY_AFTER_NOT_FOUND);
  });

  afterEach(() => {
    kyc.readSessionStatus.mockReturnValue(null);
    restoreVbaReduxServiceStore();
  });

  // Bug: a 404 from the session status GET rejects startSession, so cold entry shows the setup error instead of vendor terms.
  it.failing(
    'restarts at vendor terms when the stored session status returns 404',
    async () => {
      const { findByTestId } = renderVbaOnboardingLoading();

      expect(
        await findByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    },
  );
});
