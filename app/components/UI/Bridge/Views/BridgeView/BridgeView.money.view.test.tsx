import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { MoneyAccountAction } from '@metamask/bridge-controller';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { getRouteParamsProbeTestId } from '../../../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderBridgeViewForMoneySwap } from '../../../../../../tests/component-view/renderers/bridge';
import { PostTradeStatus } from '../../components/PostTradeBottomSheet/PostTradeBottomSheet.types';
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

const getSubmitTx = () =>
  jest.mocked(Engine.context.BridgeStatusController.submitTx);

type MoneySwapRender = ReturnType<typeof renderBridgeViewForMoneySwap>;

/**
 * Design-system Button does not forward `isDisabled` onto the testID host.
 * `props.isDisabled` is always undefined, so wait-then-press can hit a still
 * disabled / "Get new quote" control and never call submitTx (CI iOS flake).
 */
const pressEnabledConfirm = async ({
  findByTestId,
  getByTestId,
}: Pick<MoneySwapRender, 'findByTestId' | 'getByTestId'>) => {
  expect(
    await findByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON),
  ).toBeOnTheScreen();

  await waitFor(() => {
    const confirm = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
    expect(confirm.props.accessibilityState?.disabled).toBe(false);
    expect(confirm.props.accessibilityState?.busy).not.toBe(true);
    expect(confirm).toHaveTextContent(strings('bridge.confirm_swap'));
  });

  fireEvent.press(getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON));

  await waitFor(() => {
    expect(getSubmitTx()).toHaveBeenCalled();
  });
};

const expectMoneyHomeInsteadOfPostTrade = async ({
  getByTestId,
  queryByTestId,
}: Pick<MoneySwapRender, 'getByTestId' | 'queryByTestId'>) => {
  await waitFor(() => {
    expect(
      JSON.parse(
        String(
          getByTestId(getRouteParamsProbeTestId(Routes.HOME_TABS)).props
            .children,
        ),
      ),
    ).toEqual({
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });
  expect(
    queryByTestId(getRouteParamsProbeTestId(Routes.BRIDGE.MODALS.ROOT)),
  ).not.toBeOnTheScreen();
};

const expectPostTradeFailedInsteadOfMoneyHome = async ({
  getByTestId,
}: Pick<MoneySwapRender, 'getByTestId'>) => {
  await waitFor(() => {
    expect(
      JSON.parse(
        String(
          getByTestId(getRouteParamsProbeTestId(Routes.BRIDGE.MODALS.ROOT))
            .props.children,
        ),
      ),
    ).toEqual({
      screen: Routes.BRIDGE.MODALS.POST_TRADE_MODAL,
      params: expect.objectContaining({
        status: PostTradeStatus.Failed,
      }),
    });
  });
};

const renderDepositSwap = () =>
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

const renderWithdrawSwap = () =>
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

describeForPlatforms('BridgeView money swap flows', () => {
  beforeEach(() => {
    setupRecurringOrdersDataServiceMock();
    setupLimitOrdersDataServiceMock();
    setupSentinelFeeTokensDataServiceMock();
    Date.now = () => new Date().getTime();
    getSubmitTx().mockReset();
    getSubmitTx().mockResolvedValue({
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
    const screen = renderDepositSwap();

    await pressEnabledConfirm(screen);

    await expectMoneyHomeInsteadOfPostTrade(screen);
    expect(getSubmitTx()).toHaveBeenCalledWith(
      expect.objectContaining({ operation: MoneyAccountAction.Deposit }),
    );
  });

  it('sends the user to money home after confirming a withdraw swap', async () => {
    const screen = renderWithdrawSwap();

    await pressEnabledConfirm(screen);

    await expectMoneyHomeInsteadOfPostTrade(screen);
    expect(getSubmitTx()).toHaveBeenCalledWith(
      expect.objectContaining({ operation: MoneyAccountAction.Withdraw }),
    );
  });

  it('shows the failed post-trade sheet after a pre-deposit swap submit fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    getSubmitTx().mockRejectedValue(new Error('Network error'));
    const screen = renderDepositSwap();

    await pressEnabledConfirm(screen);

    await expectPostTradeFailedInsteadOfMoneyHome(screen);
    consoleSpy.mockRestore();
  });

  it('sends the user to money home after a withdraw submit fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    getSubmitTx().mockRejectedValue(new Error('Network error'));
    const screen = renderWithdrawSwap();

    await pressEnabledConfirm(screen);

    await expectMoneyHomeInsteadOfPostTrade(screen);
    consoleSpy.mockRestore();
  });
});
