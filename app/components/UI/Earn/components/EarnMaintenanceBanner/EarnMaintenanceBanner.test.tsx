import React from 'react';
import EarnMaintenanceBanner from '.';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

describe('EarnMaintenanceBanner', () => {
  const renderBanner = ({
    isPooledStakingBannerEnabled = true,
    isStablecoinLendingBannerEnabled = true,
  }: Partial<{
    isPooledStakingBannerEnabled: boolean;
    isStablecoinLendingBannerEnabled: boolean;
  }> = {}) =>
    renderWithProvider(<EarnMaintenanceBanner />, {
      state: {
        ...initialRootState,
        engine: {
          ...initialRootState.engine,
          backgroundState: {
            ...initialRootState.engine.backgroundState,
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                earnPooledStakingServiceInterruptionBannerEnabled:
                  isPooledStakingBannerEnabled,
                earnStablecoinLendingServiceInterruptionBannerEnabled:
                  isStablecoinLendingBannerEnabled,
              },
            },
          },
        },
      },
    });

  it('renders banner and maintenance message', () => {
    const { toJSON } = renderBanner();

    expect(toJSON()).toMatchSnapshot();
  });
});
