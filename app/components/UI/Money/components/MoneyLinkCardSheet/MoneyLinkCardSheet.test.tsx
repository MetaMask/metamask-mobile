import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyLinkCardSheet from './MoneyLinkCardSheet';
import { MoneyLinkCardSheetTestIds } from './MoneyLinkCardSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { selectCardHomeData } from '../../../../../selectors/cardController';
import { CardType } from '../../../Card/types';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
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
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
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

describe('MoneyLinkCardSheet', () => {
  let mockConfirmLinkInBackground: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  it('renders the container', () => {
    const { getByTestId } = renderWithProvider(<MoneyLinkCardSheet />);

    expect(getByTestId(MoneyLinkCardSheetTestIds.CONTAINER)).toBeOnTheScreen();
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
        strings('money.metamask_card.link_card_sheet_description', { apy: 4 }),
      ),
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
      getByText(
        strings('money.metamask_card.link_card_sheet_description', { apy: 7 }),
      ),
    ).toBeOnTheScreen();
    // Defence against regressions: the description must NEVER render the raw
    // i18n placeholder (which is what happens if `apy` is not passed at all).
    expect(queryByText(/{{apy}}/)).toBeNull();
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
    const getCardImageSource = (
      root: ReturnType<typeof renderWithProvider>,
    ) => {
      const illustration = root.getByTestId(
        MoneyLinkCardSheetTestIds.ILLUSTRATION,
      );
      const image = illustration.findByProps({ resizeMode: 'contain' });
      return image.props.source;
    };

    it('renders the metal card image when the user has a metal card', () => {
      mockSelectCardHomeData.mockReturnValue({
        card: { type: CardType.METAL },
      });

      const root = renderWithProvider(<MoneyLinkCardSheet />);

      expect(getCardImageSource(root)).toBe(mmCardMetal);
    });

    it('renders the virtual card image when the user has a virtual card', () => {
      mockSelectCardHomeData.mockReturnValue({
        card: { type: CardType.VIRTUAL },
      });

      const root = renderWithProvider(<MoneyLinkCardSheet />);

      expect(getCardImageSource(root)).toBe(mmCardRegular);
    });

    it('renders the virtual card image when there is no card data available', () => {
      mockSelectCardHomeData.mockReturnValue(null);

      const root = renderWithProvider(<MoneyLinkCardSheet />);

      expect(getCardImageSource(root)).toBe(mmCardRegular);
    });
  });

  it('dismisses the sheet and dispatches confirmLinkInBackground when the CTA is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyLinkCardSheet />);

    fireEvent.press(getByTestId(MoneyLinkCardSheetTestIds.CTA_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockConfirmLinkInBackground).toHaveBeenCalledTimes(1);
  });

  it('dismisses the sheet without dispatching the linkage when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyLinkCardSheet />);

    fireEvent.press(getByTestId(MoneyLinkCardSheetTestIds.CLOSE_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockConfirmLinkInBackground).not.toHaveBeenCalled();
  });
});
