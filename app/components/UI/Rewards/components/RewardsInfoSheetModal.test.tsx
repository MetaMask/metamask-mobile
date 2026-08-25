import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsInfoSheetModal, {
  REWARDS_INFO_SHEET_MODAL_TEST_IDS,
} from './RewardsInfoSheetModal';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ...actual,
    BottomSheet: ({
      children,
      testID,
      onClose,
    }: {
      children: React.ReactNode;
      testID?: string;
      onClose?: () => void;
    }) =>
      ReactActual.createElement(
        RN.View,
        { testID },
        children,
        ReactActual.createElement(RN.Pressable, {
          testID: 'bottom-sheet-backdrop',
          onPress: onClose,
        }),
      ),
    Text: (props: Record<string, unknown>) =>
      ReactActual.createElement(RN.Text, props, props.children),
    Button: ({
      children,
      onPress,
      testID,
    }: {
      children: React.ReactNode;
      onPress?: () => void;
      testID?: string;
    }) =>
      ReactActual.createElement(
        RN.Pressable,
        { onPress, testID },
        ReactActual.createElement(RN.Text, null, children),
      ),
    ButtonIcon: ({
      onPress,
      testID,
    }: {
      onPress?: () => void;
      testID?: string;
    }) => ReactActual.createElement(RN.Pressable, { onPress, testID }),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'rewards.upcoming_rewards.cta_label': 'Got it',
    };
    return map[key] ?? key;
  },
}));

const TEST_IDS = REWARDS_INFO_SHEET_MODAL_TEST_IDS;

describe('RewardsInfoSheetModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, description, and Got it CTA', () => {
    const { getByTestId, getByText } = render(
      <RewardsInfoSheetModal
        route={{
          params: {
            title: 'Eligible balance',
            description: 'Eligible balance description',
          },
        }}
      />,
    );

    expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(TEST_IDS.TITLE)).toHaveTextContent('Eligible balance');
    expect(getByTestId(TEST_IDS.DESCRIPTION)).toHaveTextContent(
      'Eligible balance description',
    );
    expect(getByText('Got it')).toBeOnTheScreen();
  });

  it('goes back when Got it is pressed', () => {
    const { getByTestId } = render(
      <RewardsInfoSheetModal
        route={{
          params: {
            title: 'Entries',
            description: 'Entries description',
          },
        }}
      />,
    );

    fireEvent.press(getByTestId(TEST_IDS.GOT_IT));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('goes back when close is pressed', () => {
    const { getByTestId } = render(
      <RewardsInfoSheetModal
        route={{
          params: {
            title: 'Current balance',
            description: 'Current balance description',
          },
        }}
      />,
    );

    fireEvent.press(getByTestId(TEST_IDS.CLOSE));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
