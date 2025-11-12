import React from 'react';
import '../../../util/test/integration/mocks';
import { createStateFixture } from '../../../util/test/integration/stateFixture';
import { renderIntegrationScreen } from '../../../util/test/integration/render';
import type { DeepPartial } from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';
import Wallet from '.';
import Routes from '../../../constants/navigation/Routes';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';

describe('Wallet (background-only integration)', () => {
  it('renders wallet home with minimal state and shows key UI elements', () => {
    const state: DeepPartial<RootState> = createStateFixture()
      .withAccountTreeForSelectedAccount()
      .withRemoteFeatureFlags({})
      .withPreferences({
        tokenNetworkFilter: { '0x1': true },
        useTokenDetection: false,
      })
      .withOverrides({
        settings: {
          basicFunctionalityEnabled: true,
        },
        engine: {
          backgroundState: {
            MultichainNetworkController: {
              isEvmSelected: true,
            },
            RewardsController: {
              activeAccount: null,
            },
          },
        },
      } as unknown as DeepPartial<RootState>)
      .build() as unknown as DeepPartial<RootState>;

    const { getByTestId } = renderIntegrationScreen(
      Wallet as unknown as React.ComponentType,
      { name: Routes.WALLET_VIEW },
      { state },
    );

    expect(getByTestId(WalletViewSelectorsIDs.WALLET_CONTAINER)).toBeTruthy();
    expect(getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toBeTruthy();
    expect(getByTestId(WalletViewSelectorsIDs.WALLET_SEND_BUTTON)).toBeTruthy();
  });
});
