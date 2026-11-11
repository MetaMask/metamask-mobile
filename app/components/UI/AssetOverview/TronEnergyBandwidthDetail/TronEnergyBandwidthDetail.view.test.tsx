import '../../../../../tests/component-view/mocks';
import React from 'react';
import { waitFor } from '@testing-library/react-native';

import { renderComponentViewScreen } from '../../../../../tests/component-view/render';
import { createStateFixture } from '../../../../../tests/component-view/stateFixture';
import type { DeepPartial } from '../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../reducers';
import { strings } from '../../../../../locales/i18n';
import TronEnergyBandwidthDetail from './TronEnergyBandwidthDetail';

const TRON_MAINNET = 'tron:728126428';

const buildTronResourcesState = (balances: Record<string, unknown>) =>
  createStateFixture()
    .withMinimalAccounts()
    .withAccountTreeForSelectedAccount()
    .withOverrides({
      engine: {
        backgroundState: {
          AssetsController: {
            selectedCurrency: 'USD',
            assetsBalance: {
              'acc-1': balances,
            },
            assetsPrice: {},
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              tron: {
                [TRON_MAINNET]: true,
              },
            },
          },
        },
      },
    } as unknown as DeepPartial<RootState>)
    .build();

const renderTronEnergyBandwidthDetail = (
  state: ReturnType<typeof buildTronResourcesState>,
) =>
  renderComponentViewScreen(
    TronEnergyBandwidthDetail as unknown as React.ComponentType,
    { name: 'TronEnergyBandwidthDetail' },
    { state },
  );

describe('TronEnergyBandwidthDetail (CV)', () => {
  it('renders an unavailable energy state while bandwidth stays readable when the metadata limit is null', async () => {
    const state = buildTronResourcesState({
      [`${TRON_MAINNET}/slip44:195`]: {
        amount: '115000004',
        metadata: {
          energy: { limit: null, available: '422103' },
          bandwidth: { limit: '600', available: '34851' },
        },
      },
    });

    const { getByText, queryByText } = renderTronEnergyBandwidthDetail(state);

    await waitFor(() => {
      expect(getByText(strings('asset_overview.tron.energy'))).toBeDefined();
    });
    expect(
      getByText(strings('asset_overview.tron.resource_unavailable')),
    ).toBeDefined();
    expect(getByText('-')).toBeDefined();
    expect(getByText('/-')).toBeDefined();

    expect(queryByText((422103).toLocaleString())).toBeNull();
    expect(
      queryByText(
        strings('asset_overview.tron.sufficient_to_cover_usdt_transfers', {
          amount: 0,
        }),
      ),
    ).toBeNull();

    expect(getByText((34851).toLocaleString())).toBeDefined();
    expect(getByText(`/${(600).toLocaleString()}`)).toBeDefined();
    expect(
      getByText(
        strings('asset_overview.tron.sufficient_to_cover_trx_transfers', {
          amount: 124,
        }),
      ),
    ).toBeDefined();
  });

  it('renders no resource values while the balance request has not completed', async () => {
    const state = buildTronResourcesState({
      [`${TRON_MAINNET}/slip44:energy`]: { amount: '400' },
    });

    const { queryByText } = renderTronEnergyBandwidthDetail(state);

    await waitFor(() => {
      expect(
        queryByText(strings('asset_overview.tron.daily_resource')),
      ).toBeDefined();
    });

    expect(queryByText(strings('asset_overview.tron.energy'))).toBeNull();
    expect(queryByText(strings('asset_overview.tron.bandwidth'))).toBeNull();
    expect(
      queryByText(strings('asset_overview.tron.resource_unavailable')),
    ).toBeNull();
    expect(queryByText('400')).toBeNull();
  });
});
