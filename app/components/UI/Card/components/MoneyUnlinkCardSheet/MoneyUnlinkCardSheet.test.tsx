import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyUnlinkCardSheet from './MoneyUnlinkCardSheet';
import { MoneyUnlinkCardSheetTestIds } from './MoneyUnlinkCardSheet.testIds';
import { useMoneyAccountCardLinkage } from '../../hooks/useMoneyAccountCardLinkage';
import { CardEntryPoint } from '../../util/metrics';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockGoBack = jest.fn();
let mockRouteParams:
  | {
      fundingSource?: string;
      entrypoint?: CardEntryPoint | string;
    }
  | undefined;

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

jest.mock('../../hooks/useMoneyAccountCardLinkage', () => ({
  useMoneyAccountCardLinkage: jest.fn(),
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

describe('MoneyUnlinkCardSheet', () => {
  let mockConfirmLinkInBackground: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    mockConfirmLinkInBackground = jest.fn().mockResolvedValue(true);
    mockUseMoneyAccountCardLinkage.mockReturnValue({
      confirmLinkInBackground: mockConfirmLinkInBackground,
    } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);
  });

  it('renders the no-other-token copy', () => {
    const { getByText } = renderWithProvider(<MoneyUnlinkCardSheet />);

    expect(getByText('Unlink Money account?')).toBeOnTheScreen();
    expect(
      getByText(
        "You'll stop earning on purchases. Future card spend will be declined until you set a new funding source. Reconnect your Money account anytime.",
      ),
    ).toBeOnTheScreen();
    expect(getByText('Keep linked')).toBeOnTheScreen();
    expect(getByText('Unlink account')).toBeOnTheScreen();
  });

  it('renders the fallback funding source copy with the provided symbol', () => {
    mockRouteParams = { fundingSource: 'USDT' };

    const { getByText } = renderWithProvider(<MoneyUnlinkCardSheet />);

    expect(getByText('Are you sure?')).toBeOnTheScreen();
    expect(
      getByText(
        "You'll stop earning on purchases. Future card spend will be funded by USDT. Reconnect your Money account anytime.",
      ),
    ).toBeOnTheScreen();
  });

  it('closes from X without unlinking', () => {
    const { getByTestId } = renderWithProvider(<MoneyUnlinkCardSheet />);

    fireEvent.press(getByTestId(MoneyUnlinkCardSheetTestIds.CLOSE_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockConfirmLinkInBackground).not.toHaveBeenCalled();
  });

  it('closes from Keep linked without unlinking', () => {
    const { getByTestId } = renderWithProvider(<MoneyUnlinkCardSheet />);

    fireEvent.press(
      getByTestId(MoneyUnlinkCardSheetTestIds.KEEP_LINKED_BUTTON),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockConfirmLinkInBackground).not.toHaveBeenCalled();
  });

  it('unlinks with a zero delegation limit', async () => {
    mockRouteParams = {
      entrypoint: CardEntryPoint.CARD_HOME_UNLINK_MONEY_ACCOUNT,
    };

    const { getByTestId } = renderWithProvider(<MoneyUnlinkCardSheet />);

    fireEvent.press(
      getByTestId(MoneyUnlinkCardSheetTestIds.UNLINK_ACCOUNT_BUTTON),
    );

    await waitFor(() => {
      expect(mockConfirmLinkInBackground).toHaveBeenCalledWith({
        delegationAmountHuman: '0',
        entrypoint: CardEntryPoint.CARD_HOME_UNLINK_MONEY_ACCOUNT,
      });
    });
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('uses the CardHome unlink entrypoint by default', async () => {
    const { getByTestId } = renderWithProvider(<MoneyUnlinkCardSheet />);

    fireEvent.press(
      getByTestId(MoneyUnlinkCardSheetTestIds.UNLINK_ACCOUNT_BUTTON),
    );

    await waitFor(() => {
      expect(mockConfirmLinkInBackground).toHaveBeenCalledWith({
        delegationAmountHuman: '0',
        entrypoint: CardEntryPoint.CARD_HOME_UNLINK_MONEY_ACCOUNT,
      });
    });
  });
});
