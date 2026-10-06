import { act, fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { createStateFixture } from '../../../../../../tests/component-view/stateFixture';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import type { QuickBuyRootProps } from '../../../QuickBuy/types';
import {
  COLLECTOR_CRYPT_SCOPE,
  SOLANA_USDC_MINT,
} from '../../providers/collector-crypt/constants';
import {
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
  createTestState,
  renderScreenWithQueryClient,
} from '../testUtils';
import { GachaOnboardingSelectorsIDs as IDs } from './GachaOnboarding.testIds';
import GachaOnboardingScreen from './GachaOnboardingScreen';

// Native Quick Buy callbacks are injected here; real navigation journeys are covered in CV.
const mockQuickBuyRoot = jest.fn((_props: QuickBuyRootProps) => null);
jest.mock('../../../QuickBuy/quickBuy', () => ({
  QuickBuy: { Root: (props: QuickBuyRootProps) => mockQuickBuyRoot(props) },
}));
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      GachaController: { completeOnboarding: jest.fn() },
      AssetsController: { getAssets: jest.fn() },
    },
  },
}));

const renderFundingStep = () => {
  const state = createStateFixture()
    .withOverrides(createTestState({ usdcAmount: '12.5' }))
    .withOverrides({
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: { [MOCK_ACCOUNT.id]: MOCK_INTERNAL_ACCOUNT },
              selectedAccount: MOCK_ACCOUNT.id,
            },
          },
        },
      },
    })
    .withAccountTreeForSelectedAccount()
    .build();
  const result = renderScreenWithQueryClient(GachaOnboardingScreen, {
    name: Routes.GACHA.ONBOARDING,
    state,
  });
  fireEvent.press(screen.getByTestId(IDs.NEXT));
  fireEvent.press(screen.getByTestId(IDs.NEXT));
  return result;
};

const openFunding = () => {
  fireEvent.press(screen.getByTestId(IDs.FUND));
  const props = mockQuickBuyRoot.mock.calls.at(-1)?.[0];
  if (!props) throw new Error('Quick Buy did not open');
  return props;
};

describe('Gacha onboarding funding contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(Engine.context.AssetsController.getAssets)
      .mockResolvedValue({});
  });

  it('funds the selected Solana account and stays on onboarding after dismissal', () => {
    renderFundingStep();

    const quickBuy = openFunding();

    expect(quickBuy).toEqual(
      expect.objectContaining({
        isVisible: true,
        destinationAddress: MOCK_ACCOUNT.address,
        target: expect.objectContaining({
          chain: COLLECTOR_CRYPT_SCOPE,
          tokenAddress: SOLANA_USDC_MINT,
        }),
        features: expect.objectContaining({ tradeModes: ['buy'] }),
      }),
    );
    expect(screen.getByTestId(IDs.BALANCE)).toHaveTextContent('12.50 USDC');

    act(() => quickBuy.onClose());

    expect(screen.getByTestId(IDs.PROGRESS)).toHaveTextContent(
      strings('gacha.onboarding.step', { step: 3, total: 3 }),
    );
    expect(screen.getByTestId(IDs.FUND)).toBeEnabled();
    expect(
      Engine.context.GachaController.completeOnboarding,
    ).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId(IDs.COMPLETE));

    expect(
      Engine.context.GachaController.completeOnboarding,
    ).toHaveBeenCalledTimes(1);
  });

  it('refreshes the balance after settlement without completing onboarding', async () => {
    renderFundingStep();
    const quickBuy = openFunding();

    await act(async () => {
      quickBuy.onTradeStateChange?.({
        status: 'submitted',
        transactionId: 'funding',
      });
      quickBuy.onClose();
    });

    expect(Engine.context.AssetsController.getAssets).not.toHaveBeenCalled();

    await act(async () => {
      quickBuy.onTradeStateChange?.({
        status: 'complete',
        transactionId: 'funding',
      });
    });

    expect(Engine.context.AssetsController.getAssets).toHaveBeenCalledWith(
      [MOCK_INTERNAL_ACCOUNT],
      expect.objectContaining({ forceUpdate: true }),
    );
    expect(
      Engine.context.GachaController.completeOnboarding,
    ).not.toHaveBeenCalled();
    expect(screen.getByTestId(IDs.COMPLETE)).toBeEnabled();
  });

  it('does not reopen funding when the original account is selected again', () => {
    const { store } = renderFundingStep();
    const originalState = store.getState().engine.backgroundState;
    openFunding();
    const otherAccount = {
      ...MOCK_INTERNAL_ACCOUNT,
      id: 'other-solana',
      address: 'OtherSolanaAddress',
    };
    const otherState = createStateFixture()
      .withOverrides({
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                accounts: { [otherAccount.id]: otherAccount },
                selectedAccount: otherAccount.id,
              },
            },
          },
        },
      })
      .withAccountTreeForSelectedAccount()
      .build().engine?.backgroundState;
    if (!otherState) throw new Error('Missing second account fixture');

    act(() => {
      Object.assign(Engine, { state: otherState });
      store.dispatch(updateBgState({ key: 'AccountsController' }));
      store.dispatch(updateBgState({ key: 'AccountTreeController' }));
    });
    mockQuickBuyRoot.mockClear();
    act(() => {
      Object.assign(Engine, { state: originalState });
      store.dispatch(updateBgState({ key: 'AccountsController' }));
      store.dispatch(updateBgState({ key: 'AccountTreeController' }));
    });

    expect(mockQuickBuyRoot).not.toHaveBeenCalled();
    expect(screen.getByTestId(IDs.FUND)).toBeEnabled();
    expect(screen.getByTestId(IDs.PROGRESS)).toHaveTextContent(
      strings('gacha.onboarding.step', { step: 3, total: 3 }),
    );
  });
});
