import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
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
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      selectedMinutes: SWAPS_LIMIT_ORDER_DEFAULT_EXPIRATION_MINUTES,
      onConfirm: mockOnConfirm,
    });
  });

  it('confirms the initial selection when confirm is pressed without changing options', () => {
    const { getByTestId } = render(<SwapsLimitOrderExpirationModalScreen />);

    fireEvent.press(
      getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.CONFIRM_BUTTON),
    );

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).toHaveBeenCalledWith(
      SWAPS_LIMIT_ORDER_DEFAULT_EXPIRATION_MINUTES,
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('confirms the newly selected expiration minutes', () => {
    const { getByTestId } = render(<SwapsLimitOrderExpirationModalScreen />);

    fireEvent.press(
      getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.OPTION(10080)),
    );
    fireEvent.press(
      getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.CONFIRM_BUTTON),
    );

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).toHaveBeenCalledWith(10080);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not confirm when the sheet is closed', () => {
    const { getByTestId } = render(<SwapsLimitOrderExpirationModalScreen />);

    fireEvent.press(
      getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.OPTION(10080)),
    );
    fireEvent.press(
      getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockOnConfirm).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
