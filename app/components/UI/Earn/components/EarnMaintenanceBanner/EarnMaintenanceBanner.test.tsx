import React from 'react';
import EarnMaintenanceBanner from '.';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';

type EarnMaintenanceExperience = Extract<
  EARN_EXPERIENCES,
  'POOLED_STAKING' | 'STABLECOIN_LENDING'
>;

describe('EarnMaintenanceBanner', () => {
  const renderBanner = (experienceName: EarnMaintenanceExperience) =>
    renderWithProvider(
      <EarnMaintenanceBanner experienceName={experienceName} />,
      {
        state: {
          ...initialRootState,
          engine: {
            ...initialRootState.engine,
            backgroundState: {
              ...initialRootState.engine.backgroundState,
              AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
            },
          },
        },
      },
    );

  it('renders maintenance message for pooled staking', () => {
    const { getByText } = renderBanner(EARN_EXPERIENCES.POOLED_STAKING);

    expect(
      getByText(
        strings('earn.service_interruption_banner.maintenance_message', {
          experienceName: 'Pooled Staking',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders maintenance message for stablecoin lending', () => {
    const { getByText } = renderBanner(EARN_EXPERIENCES.STABLECOIN_LENDING);

    expect(
      getByText(
        strings('earn.service_interruption_banner.maintenance_message', {
          experienceName: 'Stablecoin Lending',
        }),
      ),
    ).toBeOnTheScreen();
  });
});
