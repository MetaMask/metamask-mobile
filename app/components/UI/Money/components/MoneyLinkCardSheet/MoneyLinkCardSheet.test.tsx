import React from 'react';
import { act, fireEvent, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyLinkCardSheet from './MoneyLinkCardSheet';
import { MoneyLinkCardSheetTestIds } from './MoneyLinkCardSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import {
  selectCardHomeData,
  selectCardHomeDataStatus,
} from '../../../../../selectors/cardController';
import { CardType } from '../../../Card/types';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  CardActions,
  CardEntryPoint,
  CardScreens,
} from '../../../Card/util/metrics';

const MOCK_CARD_FLIP_ANIMATION_TEST_ID = 'mock-money-card-flip-animation';
const mockCardFlipProps: { current?: { isMetalCard: boolean } } = {};

jest.mock('../MoneyCardFlipAnimation', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { isMetalCard: boolean }) => {
      mockCardFlipProps.current = { isMetalCard: props.isMetalCard };
      return ReactActual.createElement(View, {
        testID: 'mock-money-card-flip-animation',
      });
    },
  };
});

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockSheetGoBackRef: { current?: () => void } = {};
const mockGoBack = jest.fn();
let mockRouteParams: { entrypoint?: CardEntryPoint | string } | undefined;
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ name: 'built-event' }));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn((_eventName?: unknown) => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

jest.mock('../../../Card/hooks/useMoneyAccountCardLinkage', () => ({
  useMoneyAccountCardLinkage: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../selectors/cardController', () => ({
  selectCardHomeData: jest.fn(),
  selectCardHomeDataStatus: jest.fn(),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        testID,
        goBack,
      }: {
        children: React.ReactNode;
        testID?: string;
        goBack?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      mockSheetGoBackRef.current = goBack;
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(View, { testID }, children);
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
  };
});

const mockUseMoneyAccountCardLinkage =
  useMoneyAccountCardLinkage as jest.MockedFunction<
    typeof useMoneyAccountCardLinkage
  >;
const mockUseMoneyAccountBalance =
  useMoneyAccountBalance as jest.MockedFunction<typeof useMoneyAccountBalance>;
const mockSelectCardHomeData = selectCardHomeData as unknown as jest.Mock;
const mockSelectCardHomeDataStatus =
  selectCardHomeDataStatus as unknown as jest.Mock;

describe('MoneyLinkCardSheet', () => {
  let mockConfirmLinkInBackground: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    mockCardFlipProps.current = undefined;
    mockConfirmLinkInBackground = jest.fn().mockResolvedValue(true);
    mockUseMoneyAccountCardLinkage.mockReturnValue({
      confirmLinkInBackground: mockConfirmLinkInBackground,
    } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);
    mockUseMoneyAccountBalance.mockReturnValue({
      apyPercent: 4,
    } as unknown as ReturnType<typeof useMoneyAccountBalance>);
    mockSelectCardHomeData.mockReturnValue({
      card: { type: CardType.VIRTUAL },
    });
    mockSelectCardHomeDataStatus.mockReturnValue('success');
  });

  it('renders the container', () => {
    const { getByTestId } = renderWithProvider(<MoneyLinkCardSheet />);

    expect(getByTestId(MoneyLinkCardSheetTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('tracks Card Viewed on mount with generic sheet entrypoint and origin', () => {
    mockRouteParams = {
      entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
    };

    renderWithProvider(<MoneyLinkCardSheet />);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      screen: CardScreens.MONEY_LINK_CARD_SHEET,
      entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
      origin_entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
      card_type: 'virtual',
    });
  });

  it('does not emit Card Viewed while the card home data fetch is still loading', () => {
    mockSelectCardHomeData.mockReturnValue(null);
    mockSelectCardHomeDataStatus.mockReturnValue('loading');

    renderWithProvider(<MoneyLinkCardSheet />);

    expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_VIEWED,
    );
  });

  it('emits the resolved card_type once the card home data fetch has succeeded', () => {
    mockSelectCardHomeData.mockReturnValue({
      card: { type: CardType.METAL },
    });
    mockSelectCardHomeDataStatus.mockReturnValue('success');

    renderWithProvider(<MoneyLinkCardSheet />);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      screen: CardScreens.MONEY_LINK_CARD_SHEET,
      entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
      origin_entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
      card_type: 'metal',
    });
  });

  it('still emits Card Viewed (virtual fallback) when card home data fails to load', () => {
    mockSelectCardHomeData.mockReturnValue(null);
    mockSelectCardHomeDataStatus.mockReturnValue('error');

    renderWithProvider(<MoneyLinkCardSheet />);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      screen: CardScreens.MONEY_LINK_CARD_SHEET,
      entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
      origin_entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
      card_type: 'virtual',
    });
  });

  it('renders the illustration, title, description, and CTA', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyLinkCardSheet />,
    );

    expect(
      getByTestId(MoneyLinkCardSheetTestIds.ILLUSTRATION),
    ).toBeOnTheScreen();
    expect(getByTestId(MoneyLinkCardSheetTestIds.TITLE)).toBeOnTheScreen();
    expect(
      getByTestId(MoneyLinkCardSheetTestIds.DESCRIPTION),
    ).toBeOnTheScreen();
    expect(getByTestId(MoneyLinkCardSheetTestIds.CTA_BUTTON)).toBeOnTheScreen();

    expect(
      getByText(strings('money.metamask_card.link_card_sheet_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('money.metamask_card.link_card_sheet_description_prefix'),
        { exact: false },
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.apy_label', { percentage: 4 })),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.metamask_card.link_card_sheet_cta')),
    ).toBeOnTheScreen();
  });

  it('interpolates the live vault APY into the description', () => {
    mockUseMoneyAccountBalance.mockReturnValue({
      apyPercent: 7,
    } as unknown as ReturnType<typeof useMoneyAccountBalance>);

    const { getByText, queryByText } = renderWithProvider(
      <MoneyLinkCardSheet />,
    );

    expect(
      getByText(strings('money.apy_label', { percentage: 7 })),
    ).toBeOnTheScreen();
    expect(queryByText(/{{apy}}/)).toBeNull();
    expect(queryByText(/{{percentage}}/)).toBeNull();
  });

  it('falls back to no-APY copy when the vault APY query has not resolved yet', () => {
    mockUseMoneyAccountBalance.mockReturnValue({
      apyPercent: undefined,
    } as unknown as ReturnType<typeof useMoneyAccountBalance>);

    const { getByText, queryByText } = renderWithProvider(
      <MoneyLinkCardSheet />,
    );

    expect(
      getByText(
        strings('money.metamask_card.link_card_sheet_description_no_apy'),
      ),
    ).toBeOnTheScreen();
    // The APY-bearing copy must not appear when there is no APY.
    expect(queryByText(/APY/)).toBeNull();
  });

  describe('card illustration adapts to user card type', () => {
    it('renders the card flip animation inside the illustration', () => {
      const { getByTestId } = renderWithProvider(<MoneyLinkCardSheet />);

      const illustration = getByTestId(MoneyLinkCardSheetTestIds.ILLUSTRATION);
      expect(
        within(illustration).getByTestId(MOCK_CARD_FLIP_ANIMATION_TEST_ID),
      ).toBeOnTheScreen();
    });

    it('passes isMetalCard true when the user has a metal card', () => {
      mockSelectCardHomeData.mockReturnValue({
        card: { type: CardType.METAL },
      });

      renderWithProvider(<MoneyLinkCardSheet />);

      expect(mockCardFlipProps.current?.isMetalCard).toBe(true);
    });

    it('passes isMetalCard false when the user has a virtual card', () => {
      mockSelectCardHomeData.mockReturnValue({
        card: { type: CardType.VIRTUAL },
      });

      renderWithProvider(<MoneyLinkCardSheet />);

      expect(mockCardFlipProps.current?.isMetalCard).toBe(false);
    });

    it('passes isMetalCard false when there is no card data available', () => {
      mockSelectCardHomeData.mockReturnValue(null);

      renderWithProvider(<MoneyLinkCardSheet />);

      expect(mockCardFlipProps.current?.isMetalCard).toBe(false);
    });
  });

  it('dismisses the sheet and dispatches confirmLinkInBackground when the CTA is pressed', async () => {
    mockRouteParams = {
      entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
    };
    const { getByTestId } = renderWithProvider(<MoneyLinkCardSheet />);
    jest.clearAllMocks();

    await act(async () => {
      fireEvent.press(getByTestId(MoneyLinkCardSheetTestIds.CTA_BUTTON));
    });

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockConfirmLinkInBackground).toHaveBeenCalledTimes(1);
    expect(mockConfirmLinkInBackground).toHaveBeenCalledWith({
      entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
    });
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      screen: CardScreens.MONEY_LINK_CARD_SHEET,
      entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
      origin_entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
      action: CardActions.MONEY_LINK_CARD_SHEET_CONFIRM_BUTTON,
      card_type: 'virtual',
    });
  });

  it('navigates back when the bottom sheet requests goBack', () => {
    renderWithProvider(<MoneyLinkCardSheet />);

    mockSheetGoBackRef.current?.();

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not surface confirmLinkInBackground rejections from the CTA press', async () => {
    mockConfirmLinkInBackground.mockRejectedValue(new Error('link failed'));
    const { getByTestId } = renderWithProvider(<MoneyLinkCardSheet />);

    await act(async () => {
      fireEvent.press(getByTestId(MoneyLinkCardSheetTestIds.CTA_BUTTON));
    });

    expect(mockConfirmLinkInBackground).toHaveBeenCalledTimes(1);
  });

  it('dismisses the sheet without dispatching the linkage when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyLinkCardSheet />);
    jest.clearAllMocks();

    fireEvent.press(getByTestId(MoneyLinkCardSheetTestIds.CLOSE_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockConfirmLinkInBackground).not.toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      screen: CardScreens.MONEY_LINK_CARD_SHEET,
      entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
      origin_entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
      action: CardActions.MONEY_LINK_CARD_SHEET_CLOSE_BUTTON,
      card_type: 'virtual',
    });
  });
});
