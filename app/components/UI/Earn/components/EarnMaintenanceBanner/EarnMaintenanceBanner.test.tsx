import React from 'react';
import EarnMaintenanceBanner from '.';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';

describe('EarnMaintenanceBanner', () => {
  const renderBanner = () =>
    renderWithProvider(<EarnMaintenanceBanner />, {
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
    });

  it('renders banner and maintenance message', () => {
    const { toJSON } = renderBanner();

    expect(toJSON()).toMatchSnapshot();
    expect(
      strings('earn.service_interruption_banner.maintenance_message'),
    ).toBeDefined();
  });
});
