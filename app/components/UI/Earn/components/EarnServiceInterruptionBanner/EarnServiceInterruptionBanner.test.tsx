import React from 'react';
import EarnServiceInterruptionBanner from '.';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';

const bannerTitle = strings('earn.service_interruption_banner.title');
const pooledStakingServiceName = strings(
  'earn.service_interruption_banner.pooled_staking_service_name',
);
const stablecoinLendingServiceName = strings(
  'earn.service_interruption_banner.stablecoin_lending_service_name',
);

describe('EarnServiceInterruptionBanner', () => {
  const renderBanner = ({
    isPooledStakingBannerEnabled = false,
    isStablecoinLendingBannerEnabled = false,
  }: Partial<{
    isPooledStakingBannerEnabled: boolean;
    isStablecoinLendingBannerEnabled: boolean;
  }> = {}) =>
    renderWithProvider(<EarnServiceInterruptionBanner />, {
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

  it('banner message only displays pooled-staking when feature flag set', () => {
    const { toJSON, getByText, queryByText } = renderBanner({
      isPooledStakingBannerEnabled: true,
    });

    expect(toJSON()).toMatchSnapshot();
    expect(getByText(bannerTitle)).toBeDefined();
    expect(getByText(pooledStakingServiceName)).toBeDefined();
    expect(queryByText(stablecoinLendingServiceName)).toBeNull();
  });

  it('banner message only displays stablecoin lending when feature flag set', () => {
    const { toJSON, getByText, queryByText } = renderBanner({
      isStablecoinLendingBannerEnabled: true,
    });

    expect(toJSON()).toMatchSnapshot();
    expect(getByText(bannerTitle)).toBeDefined();
    expect(getByText(stablecoinLendingServiceName)).toBeDefined();
    expect(queryByText(pooledStakingServiceName)).toBeNull();
  });

  it('banner message includes multiple services if multiple have their feature flag set', () => {
    const { toJSON, getByText } = renderBanner({
      isPooledStakingBannerEnabled: true,
      isStablecoinLendingBannerEnabled: true,
    });

    expect(toJSON()).toMatchSnapshot();
    expect(getByText(bannerTitle)).toBeDefined();
    expect(
      getByText(`${pooledStakingServiceName}, ${stablecoinLendingServiceName}`),
    ).toBeDefined();
  });

  it('should not render when no services are down', () => {
    const { toJSON, queryByText } = renderBanner();

    expect(toJSON()).toMatchSnapshot();

    expect(queryByText(bannerTitle)).toBeDefined();
    expect(queryByText(stablecoinLendingServiceName)).toBeNull();
    expect(queryByText(pooledStakingServiceName)).toBeNull();
  });
});
