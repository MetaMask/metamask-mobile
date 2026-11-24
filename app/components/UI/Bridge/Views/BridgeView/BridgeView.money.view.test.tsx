import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { MoneyAccountAction } from '@metamask/bridge-controller';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { getRouteParamsProbeTestId } from '../../../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderBridgeViewForMoneySwap } from '../../../../../../tests/component-view/renderers/bridge';
import {
  clearLimitOrdersDataServiceMock,
  setupLimitOrdersDataServiceMock,
} from '../../../../../../tests/component-view/api-mocking/limitOrders';
import {
  clearRecurringOrdersDataServiceMock,
  setupRecurringOrdersDataServiceMock,
} from '../../../../../../tests/component-view/api-mocking/recurringOrders';
import {
  clearSentinelFeeTokensDataServiceMock,
  setupSentinelFeeTokensDataServiceMock,
} from '../../../../../../tests/component-view/api-mocking/sentinelFeeTokens';
import {
  DEFAULT_BRIDGE,
  USDC_DEST,
} from '../../_mocks_/bridgeViewTestConstants';
import { BridgeViewSelectorsIDs } from './BridgeView.testIds';
import type { BridgeToken } from '../../types';

/**
 * Test layer placement: Component-view.
 * Deposit/withdraw swap confirm is a registered-route nav journey (Money home
 * vs post-trade sheet). Engine.submitTx is the allowed I/O spy. Appium is not
 * justified: no device/native boundary. No Bridge integration harness exists.
 */

const MONEY_TOKEN: BridgeToken = {
  address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  chainId: '0x1',
  decimals: 6,
  symbol: 'MUSD',
  name: 'Money',
  isMoneyToken: true,
  balance: '100',
};

const submitTx = Engine.context.BridgeStatusController.submitTx as jest.Mock;

const pressEnabledConfirm = async (
  findByTestId: (id: string) => Promise<unknown>,
  getByTestId: (id: string) => { props: { isDisabled?: boolean } },
) => {
  expect(
    await findByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON),
  ).toBeOnTheScreen();

  await waitFor(() => {
    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON).props.isDisabled,
    ).not.toBe(true);
  });

  fireEvent.press(getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON));
};

const expectMoneyHomeInsteadOfPostTrade = async (
  findByTestId: (id: string) => Promise<{ props: { children?: unknown } }>,
  queryByTestId: (id: string) => unknown,
) => {
  const homeParams = await findByTestId(
    getRouteParamsProbeTestId(Routes.HOME_TABS),
  );
  expect(JSON.parse(String(homeParams.props.children))).toEqual({
    screen: Routes.MONEY.ROOT,
    params: { screen: Routes.MONEY.HOME },
  });
  expect(
    queryByTestId(getRouteParamsProbeTestId(Routes.BRIDGE.MODALS.ROOT)),
  ).not.toBeOnTheScreen();
};

describeForPlatforms('BridgeView money swap flows', () => {
  beforeEach(() => {
    setupRecurringOrdersDataServiceMock();
    setupLimitOrdersDataServiceMock();
    setupSentinelFeeTokensDataServiceMock();
    Date.now = () => new Date().getTime();
    submitTx.mockReset();
    submitTx.mockResolvedValue({
      success: true,
      id: 'tx-1',
      hash: '0xabc',
    });
  });

  afterEach(() => {
    clearRecurringOrdersDataServiceMock();
    clearLimitOrdersDataServiceMock();
    clearSentinelFeeTokensDataServiceMock();
  });

  it('sends the user to money home after confirming a deposit swap', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderBridgeViewForMoneySwap({
        deterministicFiat: true,
        destTokenAddress: MONEY_TOKEN.address,
        overrides: {
          bridge: {
            ...DEFAULT_BRIDGE,
            destToken: MONEY_TOKEN,
            selectedDestChainId: '0x1',
            isDestTokenManuallySet: true,
          },
        },
      });

    await pressEnabledConfirm(findByTestId, getByTestId);

    await expectMoneyHomeInsteadOfPostTrade(findByTestId, queryByTestId);
    expect(submitTx).toHaveBeenCalledWith(
      expect.objectContaining({ operation: MoneyAccountAction.Deposit }),
    );
  });

  it('sends the user to money home after confirming a withdraw swap', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderBridgeViewForMoneySwap({
        deterministicFiat: true,
        srcTokenAddress: MONEY_TOKEN.address,
        destTokenAddress: USDC_DEST.address,
        srcAmount: '1000000',
        overrides: {
          bridge: {
            ...DEFAULT_BRIDGE,
            sourceAmount: '1',
            sourceToken: MONEY_TOKEN,
            destToken: {
              ...USDC_DEST,
            },
            selectedDestChainId: '0x1',
            isDestTokenManuallySet: true,
          },
        },
      });

    await pressEnabledConfirm(findByTestId, getByTestId);

    await expectMoneyHomeInsteadOfPostTrade(findByTestId, queryByTestId);
    expect(submitTx).toHaveBeenCalledWith(
      expect.objectContaining({ operation: MoneyAccountAction.Withdraw }),
    );
  });
});
