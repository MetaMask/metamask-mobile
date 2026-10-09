import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { SWAPS_LIMIT_ORDER_DEFAULT_EXPIRATION_MINUTES } from '../../constants/limitOrders';
import { SwapsLimitOrderExpirationModalScreen } from './SwapsLimitOrderExpirationModalScreen';
import { SwapsLimitOrderExpirationModalSelectorsIDs } from './testIds';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: ReactModule.forwardRef(
      (
        {
          children,
          goBack,
          testID,
        }: {
          children?: React.ReactNode;
          goBack?: () => void;
          testID?: string;
        },
        ref: React.Ref<{
          onCloseBottomSheet: (callback?: () => void) => void;
        }>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => {
            callback?.();
            goBack?.();
          },
        }));

        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe('SwapsLimitOrderExpirationModalScreen', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      selectedMinutes: SWAPS_LIMIT_ORDER_DEFAULT_EXPIRATION_MINUTES,
      onSelect: mockOnSelect,
    });
  });

  it('does not render a confirm button', () => {
    const { getByTestId, queryByText } = render(
      <SwapsLimitOrderExpirationModalScreen />,
    );

    expect(
      getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(queryByText(strings('bridge.confirm'))).not.toBeOnTheScreen();
  });

  describe('selecting an option', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('applies the selection immediately and closes the sheet after 250ms', () => {
      const { getByTestId } = render(<SwapsLimitOrderExpirationModalScreen />);

      fireEvent.press(
        getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.OPTION(10080)),
      );

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(10080);
      expect(mockGoBack).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('closes the sheet without changing the selection when close is pressed', () => {
    const { getByTestId } = render(<SwapsLimitOrderExpirationModalScreen />);

    fireEvent.press(
      getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockOnSelect).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
