import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyHowItWorksView from './MoneyHowItWorksView';
import { MoneyHowItWorksViewTestIds } from './MoneyHowItWorksView.testIds';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  MONEY_URLS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';

const mockTrackScreenViewed = jest.fn();
const mockTrackButtonClicked = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

const mockGoBack = jest.fn();

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: jest.fn(),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 48, bottom: 34, left: 0, right: 0 }),
}));

describe('MoneyHowItWorksView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackScreenViewed: mockTrackScreenViewed,
      trackButtonClicked: mockTrackButtonClicked,
    });
    (useMoneyAccountBalance as jest.Mock).mockReturnValue({
      apyPercent: 4,
    });
  });

  it('renders the section title', () => {
    const { getByTestId } = renderWithProvider(<MoneyHowItWorksView />);

    expect(
      getByTestId(MoneyHowItWorksViewTestIds.SECTION_TITLE),
    ).toBeOnTheScreen();
  });

  it('renders both description paragraphs', () => {
    const { getByTestId } = renderWithProvider(<MoneyHowItWorksView />);

    expect(
      getByTestId(MoneyHowItWorksViewTestIds.DESCRIPTION_1),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyHowItWorksViewTestIds.DESCRIPTION_2),
    ).toBeOnTheScreen();
  });

  it('renders the Monad attribution as the third description paragraph', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyHowItWorksView />,
    );

    expect(
      getByTestId(MoneyHowItWorksViewTestIds.DESCRIPTION_3),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.how_it_works_page.description_3')),
    ).toBeOnTheScreen();
  });

  it('renders the FAQ title', () => {
    const { getByTestId } = renderWithProvider(<MoneyHowItWorksView />);

    expect(getByTestId(MoneyHowItWorksViewTestIds.FAQ_TITLE)).toBeOnTheScreen();
  });

  it('applies safe-area bottom padding to the scroll content', () => {
    const { getByTestId } = renderWithProvider(<MoneyHowItWorksView />);

    const scrollView = getByTestId(MoneyHowItWorksViewTestIds.SCROLL_VIEW);

    expect(scrollView.props.contentContainerStyle).toEqual(
      expect.objectContaining({ paddingBottom: 34 + 24 }),
    );
  });

  it('renders the "FAQs" FAQ header', () => {
    const { getByText } = renderWithProvider(<MoneyHowItWorksView />);

    expect(
      getByText(strings('money.how_it_works_page.faq_title')),
    ).toBeOnTheScreen();
  });

  it('reveals the matching answer when a FAQ item is expanded', () => {
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <MoneyHowItWorksView />,
    );

    expect(queryByText(strings('money.how_it_works_page.faq_a2'))).toBeNull();

    fireEvent.press(getByTestId(MoneyHowItWorksViewTestIds.FAQ_ITEM(2)));

    expect(
      getByText(strings('money.how_it_works_page.faq_a2')),
    ).toBeOnTheScreen();
  });

  it('renders all 10 FAQ questions', () => {
    const { getByText } = renderWithProvider(<MoneyHowItWorksView />);

    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((n) => {
      expect(
        getByText(strings(`money.how_it_works_page.faq_q${n}`)),
      ).toBeOnTheScreen();
    });
  });

  it('pressing the back button calls navigation.goBack', () => {
    const { getByTestId } = renderWithProvider(<MoneyHowItWorksView />);

    fireEvent.press(getByTestId(MoneyHowItWorksViewTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not render a Sounds good primary CTA', () => {
    const { queryByText } = renderWithProvider(<MoneyHowItWorksView />);
    expect(queryByText('Sounds good')).toBeNull();
  });

  it('renders the dash placeholder in description_1 when APY is unavailable', () => {
    (useMoneyAccountBalance as jest.Mock).mockReturnValue({
      apyPercent: undefined,
    });
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyHowItWorksView />,
    );

    expect(getByTestId(MoneyHowItWorksViewTestIds.CONTAINER)).toBeOnTheScreen();
    expect(
      getByText(
        strings('money.how_it_works_page.description_1', { percentage: '-' }),
      ),
    ).toBeOnTheScreen();
  });

  it('toggles a FAQ item when the question row is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHowItWorksView />);

    const firstFaq = getByTestId(MoneyHowItWorksViewTestIds.FAQ_ITEM(1));

    // Press once to expand, again to collapse — both branches of handlePress
    // (prev=false → 180deg, prev=true → 0deg) execute without throwing.
    fireEvent.press(firstFaq);
    fireEvent.press(firstFaq);

    expect(firstFaq).toBeOnTheScreen();
  });

  it('renders the Risk and Disclosures section', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyHowItWorksView />,
    );

    expect(
      getByTestId(MoneyHowItWorksViewTestIds.DISCLOSURES_TITLE),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.how_it_works_page.disclosures_body')),
    ).toBeOnTheScreen();
  });

  it('opens the Card fees breakdown when the fees FAQ link is pressed', () => {
    const openURLSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);

    const { getByTestId } = renderWithProvider(<MoneyHowItWorksView />);

    fireEvent.press(getByTestId(MoneyHowItWorksViewTestIds.FAQ_ITEM(4)));
    fireEvent.press(getByTestId(MoneyHowItWorksViewTestIds.FAQ_LINK));

    expect(openURLSpy).toHaveBeenCalledWith(AppConstants.CARD.CARD_FEES_URL);
  });

  it('tracks a button click when the fees FAQ link is pressed', () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const { getByTestId } = renderWithProvider(<MoneyHowItWorksView />);

    fireEvent.press(getByTestId(MoneyHowItWorksViewTestIds.FAQ_ITEM(4)));
    fireEvent.press(getByTestId(MoneyHowItWorksViewTestIds.FAQ_LINK));

    expect(mockTrackButtonClicked).toHaveBeenCalledWith({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.CARD_FEES,
      component_name: COMPONENT_NAMES.FAQ_ITEM,
      label_key: 'money.how_it_works_page.faq_a4_link',
      redirect_target: MONEY_URLS.CARD_FEES,
    });
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with MONEY_HOW_IT_WORKS screen_name', () => {
      renderWithProvider(<MoneyHowItWorksView />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        screen_name: SCREEN_NAMES.MONEY_HOW_IT_WORKS,
      });
    });

    it('calls trackScreenViewed on mount', () => {
      renderWithProvider(<MoneyHowItWorksView />);

      expect(mockTrackScreenViewed).toHaveBeenCalledTimes(1);
    });
  });
});
