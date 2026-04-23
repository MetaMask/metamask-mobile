import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyHowItWorksView from './MoneyHowItWorksView';
import { MoneyHowItWorksViewTestIds } from './MoneyHowItWorksView.testIds';

const mockGoBack = jest.fn();

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

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string) => {
    const map: Record<string, string> = {
      'money.how_it_works_page.header_title': 'Money',
      'money.how_it_works_page.section_title': 'How it works',
      'money.how_it_works_page.description_1':
        'Your Money account earns 4% APY (variable) automatically. Funds go into a curated DeFi vault that generates returns across audited lending markets—no staking, no claiming, no lock-ups.',
      'money.how_it_works_page.description_2':
        'Your Money balance is your spending balance. Link your MetaMask Card to spend at 150M+ merchants worldwide. Your money keeps earning until the moment you use it.',
      'money.how_it_works_page.faq_title': 'FAQ',
      'money.how_it_works_page.faq_placeholder_answer': 'Coming soon.',
      'money.how_it_works_page.faq_q1': 'What is the Money account?',
      'money.how_it_works_page.faq_q2': 'What is mUSD?',
      'money.how_it_works_page.faq_q3': 'Where does the yield come from?',
      'money.how_it_works_page.faq_q4':
        'Is my money locked? Can I withdraw anytime?',
      'money.how_it_works_page.faq_q5':
        'How does spending with the MetaMask Card work?',
      'money.how_it_works_page.faq_q6': 'Are there any fees?',
      'money.how_it_works_page.faq_q7': 'Does the APY rate change?',
      'money.how_it_works_page.faq_q8':
        'Is this a savings account or a spending account?',
      'money.how_it_works_page.faq_q9': 'Who controls my money?',
      'money.how_it_works_page.faq_q10':
        'What cash back do I get with the MetaMask Card?',
      'money.how_it_works_page.sounds_good': 'Sounds good',
    };
    return map[key] ?? key;
  },
}));

describe('MoneyHowItWorksView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('renders the FAQ title', () => {
    const { getByTestId } = renderWithProvider(<MoneyHowItWorksView />);

    expect(getByTestId(MoneyHowItWorksViewTestIds.FAQ_TITLE)).toBeOnTheScreen();
  });

  it('renders all 10 FAQ questions', () => {
    const { getByText } = renderWithProvider(<MoneyHowItWorksView />);

    expect(getByText('What is the Money account?')).toBeOnTheScreen();
    expect(getByText('What is mUSD?')).toBeOnTheScreen();
    expect(getByText('Where does the yield come from?')).toBeOnTheScreen();
    expect(
      getByText('Is my money locked? Can I withdraw anytime?'),
    ).toBeOnTheScreen();
    expect(
      getByText('How does spending with the MetaMask Card work?'),
    ).toBeOnTheScreen();
    expect(getByText('Are there any fees?')).toBeOnTheScreen();
    expect(getByText('Does the APY rate change?')).toBeOnTheScreen();
    expect(
      getByText('Is this a savings account or a spending account?'),
    ).toBeOnTheScreen();
    expect(getByText('Who controls my money?')).toBeOnTheScreen();
    expect(
      getByText('What cash back do I get with the MetaMask Card?'),
    ).toBeOnTheScreen();
  });

  it('pressing the back button calls navigation.goBack', () => {
    const { getByTestId } = renderWithProvider(<MoneyHowItWorksView />);

    fireEvent.press(getByTestId(MoneyHowItWorksViewTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('pressing the Sounds good button calls navigation.goBack', () => {
    const { getByTestId } = renderWithProvider(<MoneyHowItWorksView />);

    fireEvent.press(getByTestId(MoneyHowItWorksViewTestIds.SOUNDS_GOOD_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
