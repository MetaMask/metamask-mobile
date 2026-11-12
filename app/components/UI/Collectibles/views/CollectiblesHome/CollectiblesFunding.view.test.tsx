import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderCollectiblesView } from '../../../../../../tests/component-view/renderers/collectibles';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import {
  CollectiblesHomeTestIds,
  CollectiblesPackCardTestIds,
  CollectiblesPackDetailTestIds,
  CollectiblesPurchaseSheetTestIds,
} from '../../Collectibles.testIds';
import { QuickBuySheetSelectorsIDs } from '../../../QuickBuy/QuickBuySheet.testIds';
import {
  packPartnerReads,
  createPack,
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
} from '../testUtils';
import CollectiblesHome from './CollectiblesHome';
import CollectiblesSearch from '../CollectiblesSearch/CollectiblesSearch';
import CollectiblesExplore from '../CollectiblesExplore/CollectiblesExplore';
import CollectiblesPack from '../CollectiblesPack/CollectiblesPack';

const PACK = createPack();
const controller = {
  generatePack: jest.fn(),
};
const submitTx = jest.fn();

const WalletPurchaseEntry = () => {
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <Pressable
      testID="collectibles-wallet-purchase-entry"
      onPress={() =>
        navigation.navigate(Routes.COLLECTIBLES.HOME, {
          initialTab: 'packs',
          entry: { kind: 'purchase', packCode: PACK.code },
        })
      }
    >
      <Text>Open pack from wallet</Text>
    </Pressable>
  );
};

/** Solana Pay is unavailable: reviewing a pack cannot launch a bridge or purchase. */
describeForPlatforms('Collectibles payment availability', () => {
  beforeEach(() => {
    Object.values(controller).forEach((method) => method.mockReset());
    packPartnerReads.getPacks.mockResolvedValue([PACK]);
    submitTx.mockReset();
    Object.assign(Engine.context, { CollectiblesController: controller });
    Object.assign(Engine.context.BridgeStatusController, { submitTx });
  });

  it.each([
    {
      label: 'catalogue',
      entry: { Component: CollectiblesHome, name: Routes.COLLECTIBLES.HOME },
      params: { initialTab: 'packs' },
      openOnEntry: false,
      screenId: CollectiblesHomeTestIds.CONTAINER,
    },
    {
      label: 'wallet onboarding entry',
      entry: { Component: WalletPurchaseEntry, name: 'WalletHome' },
      params: {},
      openOnEntry: true,
      screenId: CollectiblesHomeTestIds.CONTAINER,
    },
    {
      label: 'search',
      entry: {
        Component: CollectiblesSearch,
        name: Routes.COLLECTIBLES.SEARCH,
      },
      params: { scope: 'packs' },
      openOnEntry: false,
      screenId: 'collectibles-search',
    },
    {
      label: 'profile',
      entry: {
        Component: CollectiblesExplore,
        name: Routes.COLLECTIBLES.EXPLORE,
      },
      params: { screen: 'profile', profileId: 'collector' },
      openOnEntry: false,
      screenId: 'collectibles-profile-cards',
    },
  ])(
    'discards the $label purchase review when account identity changes and uses its new balance',
    async ({ entry, params, openOnEntry, screenId }) => {
      const { store } = renderCollectiblesView({
        entry,
        params,
        routes: openOnEntry
          ? [{ name: Routes.COLLECTIBLES.HOME, Component: CollectiblesHome }]
          : [],
      });
      if (openOnEntry) {
        fireEvent.press(
          screen.getByTestId('collectibles-wallet-purchase-entry'),
        );
      } else {
        fireEvent.press(
          await screen.findByTestId(
            CollectiblesPackCardTestIds.OPEN_BUTTON(PACK.code),
          ),
        );
      }
      expect(
        await screen.findByTestId(
          CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON,
        ),
      ).toBeEnabled();
      const nextAccount = {
        ...MOCK_INTERNAL_ACCOUNT,
        id: 'second-solana-account',
        // A second imported identity can expose the same address. Its funds are keyed by ID.
        address: MOCK_ACCOUNT.address,
      };
      const background = store.getState().engine.backgroundState;
      const tree = background.AccountTreeController;
      const wallet = tree.accountTree.wallets['entropy:wallet1'];
      act(() => {
        Object.assign(Engine, {
          state: {
            AccountsController: {
              ...background.AccountsController,
              internalAccounts: {
                ...background.AccountsController.internalAccounts,
                accounts: {
                  [MOCK_ACCOUNT.id]: MOCK_INTERNAL_ACCOUNT,
                  [nextAccount.id]: nextAccount,
                },
                selectedAccount: nextAccount.id,
              },
            },
            AccountTreeController: {
              ...tree,
              accountTree: {
                wallets: {
                  'entropy:wallet1': {
                    ...wallet,
                    groups: {
                      'entropy:wallet1/0': {
                        ...wallet.groups['entropy:wallet1/0'],
                        accounts: [nextAccount.id],
                      },
                    },
                  },
                },
              },
            },
          },
        });
        store.dispatch(updateBgState({ key: 'AccountsController' }));
        store.dispatch(updateBgState({ key: 'AccountTreeController' }));
      });

      expect(
        screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
      ).not.toBeOnTheScreen();
      expect(controller.generatePack).not.toHaveBeenCalled();
      fireEvent.press(
        screen.getByTestId(CollectiblesPackCardTestIds.OPEN_BUTTON(PACK.code)),
      );
      expect(
        await screen.findByTestId(
          CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON,
        ),
      ).toBeDisabled();
      fireEvent.press(
        screen.getByTestId(CollectiblesPurchaseSheetTestIds.CLOSE_BUTTON),
      );
      expect(await screen.findByTestId(screenId)).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
      ).not.toBeOnTheScreen();
      expect(controller.generatePack).not.toHaveBeenCalled();
    },
  );

  it('disables purchase and payment selection when Solana USDC is insufficient', async () => {
    renderCollectiblesView({
      entry: { Component: CollectiblesPack, name: Routes.COLLECTIBLES.PACK },
      params: { packCode: PACK.code },
      usdcAmount: '30',
    });
    fireEvent.press(
      await screen.findByTestId(CollectiblesPackDetailTestIds.BUY),
    );

    const confirm = await screen.findByTestId(
      CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON,
    );
    expect(confirm).toBeDisabled();
    expect(screen.getByTestId('collectibles-payment-selector')).toBeDisabled();
    expect(
      screen.getByTestId('collectibles-insufficient-usdc'),
    ).toBeOnTheScreen();
    fireEvent.press(confirm);

    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(submitTx).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId(QuickBuySheetSelectorsIDs.CONTENT_CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesHomeTestIds.FUND_BUTTON),
    ).not.toBeOnTheScreen();
  });
});
