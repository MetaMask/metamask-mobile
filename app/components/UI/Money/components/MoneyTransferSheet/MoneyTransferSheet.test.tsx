import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyTransferSheet from './MoneyTransferSheet';
import { MoneyTransferSheetTestIds } from './MoneyTransferSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';
import { useMoneyPerpsDeposit } from '../../../../Views/confirmations/hooks/pay/useMoneyPerpsDeposit';
import { useMoneyPredictDeposit } from '../../../../Views/confirmations/hooks/pay/useMoneyPredictDeposit';
import { selectPerpsEligibility } from '../../../Perps/selectors/perpsController';
import { usePredictEligibility } from '../../../Predict/hooks/usePredictEligibility';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';

const mockTrackBottomSheetViewed = jest.fn();
const mockTrackSurfaceClicked = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock('../../../../../selectors/transactionController', () => ({
  ...jest.requireActual('../../../../../selectors/transactionController'),
  selectTransactions: jest.fn(() => []),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectPrivacyMode: jest.fn(() => false),
}));

const mockInitiateWithdrawal = jest.fn().mockResolvedValue(undefined);
const mockInitiatePerpsDeposit = jest.fn().mockResolvedValue(undefined);
const mockInitiatePredictDeposit = jest.fn().mockResolvedValue(undefined);
const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockGoBack = jest.fn();

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountWithdrawal: jest.fn(),
  useMoneyAccountDeposit: jest.fn(),
}));

jest.mock(
  '../../../../Views/confirmations/hooks/pay/useMoneyPerpsDeposit',
  () => ({
    useMoneyPerpsDeposit: jest.fn(),
  }),
);

jest.mock(
  '../../../../Views/confirmations/hooks/pay/useMoneyPredictDeposit',
  () => ({
    useMoneyPredictDeposit: jest.fn(),
  }),
);

jest.mock('../../../Perps/selectors/perpsController', () => ({
  selectPerpsEligibility: jest.fn(() => true),
}));

jest.mock('../../../Predict/hooks/usePredictEligibility', () => ({
  usePredictEligibility: jest.fn(() => ({ isEligible: true })),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return <View testID={testID}>{children}</View>;
    },
  );
  const MockBottomSheetHeader = ({
    children,
  }: {
    children: React.ReactNode;
  }) => <View>{children}</View>;
  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

describe('MoneyTransferSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
    (useMoneyAccountWithdrawal as jest.Mock).mockReturnValue({
      initiateWithdrawal: mockInitiateWithdrawal,
    });
    (useMoneyPerpsDeposit as jest.Mock).mockReturnValue({
      isEnabled: false,
      initiatePerpsDeposit: mockInitiatePerpsDeposit,
    });
    (useMoneyPredictDeposit as jest.Mock).mockReturnValue({
      isEnabled: false,
      initiatePredictDeposit: mockInitiatePredictDeposit,
    });
    (selectPerpsEligibility as unknown as jest.Mock).mockReturnValue(true);
    (usePredictEligibility as jest.Mock).mockReturnValue({ isEligible: true });
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
      trackSurfaceClicked: mockTrackSurfaceClicked,
    });
  });

  it('renders the sheet title', () => {
    const { getByText } = renderWithProvider(<MoneyTransferSheet />);

    expect(getByText(strings('money.transfer_sheet.title'))).toBeOnTheScreen();
  });

  it('renders all five list items', () => {
    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    expect(
      getByTestId(MoneyTransferSheetTestIds.BETWEEN_ACCOUNTS_OPTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyTransferSheetTestIds.PERPS_ACCOUNT_OPTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyTransferSheetTestIds.SEND_EXTERNAL_ROW),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyTransferSheetTestIds.WITHDRAW_TO_BANK_ROW),
    ).toBeOnTheScreen();
  });

  it('renders "Coming soon" tags on the last two items', () => {
    const { getAllByText } = renderWithProvider(<MoneyTransferSheet />);

    const comingSoonTags = getAllByText(
      strings('money.add_money_sheet.coming_soon'),
    );
    expect(comingSoonTags).toHaveLength(2);
  });

  it('closes the sheet and calls initiateWithdrawal when "Another account" is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    fireEvent.press(
      getByTestId(MoneyTransferSheetTestIds.BETWEEN_ACCOUNTS_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateWithdrawal).toHaveBeenCalledTimes(1);
    expect(global.alert).not.toHaveBeenCalled();
  });

  it('disables the "Perps account" option when flag is disabled', () => {
    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    expect(
      getByTestId(MoneyTransferSheetTestIds.PERPS_ACCOUNT_OPTION),
    ).toBeDisabled();
  });

  it('does nothing when "Perps account" is pressed and flag is disabled', () => {
    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    fireEvent.press(
      getByTestId(MoneyTransferSheetTestIds.PERPS_ACCOUNT_OPTION),
    );

    expect(mockOnCloseBottomSheet).not.toHaveBeenCalled();
    expect(mockInitiatePerpsDeposit).not.toHaveBeenCalled();
  });

  it('enables the "Perps account" option when flag is enabled', () => {
    (useMoneyPerpsDeposit as jest.Mock).mockReturnValue({
      isEnabled: true,
      initiatePerpsDeposit: mockInitiatePerpsDeposit,
    });

    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    expect(
      getByTestId(MoneyTransferSheetTestIds.PERPS_ACCOUNT_OPTION),
    ).toBeEnabled();
  });

  it('closes the sheet and calls initiatePerpsDeposit when flag is enabled', () => {
    (useMoneyPerpsDeposit as jest.Mock).mockReturnValue({
      isEnabled: true,
      initiatePerpsDeposit: mockInitiatePerpsDeposit,
    });

    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    fireEvent.press(
      getByTestId(MoneyTransferSheetTestIds.PERPS_ACCOUNT_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiatePerpsDeposit).toHaveBeenCalledTimes(1);
  });

  it('hides the "Perps account" option when user is geo-blocked, even if flag is enabled', () => {
    (useMoneyPerpsDeposit as jest.Mock).mockReturnValue({
      isEnabled: true,
      initiatePerpsDeposit: mockInitiatePerpsDeposit,
    });
    (selectPerpsEligibility as unknown as jest.Mock).mockReturnValue(false);

    const { queryByTestId } = renderWithProvider(<MoneyTransferSheet />);

    expect(
      queryByTestId(MoneyTransferSheetTestIds.PERPS_ACCOUNT_OPTION),
    ).toBeNull();
  });

  it('disables the "Predictions account" option when flag is disabled', () => {
    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    expect(
      getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
    ).toBeDisabled();
  });

  it('does nothing when "Predictions account" is pressed and flag is disabled', () => {
    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    fireEvent.press(
      getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
    );

    expect(mockOnCloseBottomSheet).not.toHaveBeenCalled();
    expect(mockInitiatePredictDeposit).not.toHaveBeenCalled();
  });

  it('enables the "Predictions account" option when flag is enabled', () => {
    (useMoneyPredictDeposit as jest.Mock).mockReturnValue({
      isEnabled: true,
      initiatePredictDeposit: mockInitiatePredictDeposit,
    });

    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    expect(
      getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
    ).toBeEnabled();
  });

  it('closes the sheet and calls initiatePredictDeposit when flag is enabled', () => {
    (useMoneyPredictDeposit as jest.Mock).mockReturnValue({
      isEnabled: true,
      initiatePredictDeposit: mockInitiatePredictDeposit,
    });

    const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

    fireEvent.press(
      getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiatePredictDeposit).toHaveBeenCalledTimes(1);
  });

  it('hides the "Predictions account" option when user is geo-blocked, even if flag is enabled', () => {
    (useMoneyPredictDeposit as jest.Mock).mockReturnValue({
      isEnabled: true,
      initiatePredictDeposit: mockInitiatePredictDeposit,
    });
    (usePredictEligibility as jest.Mock).mockReturnValue({ isEligible: false });

    const { queryByTestId } = renderWithProvider(<MoneyTransferSheet />);

    expect(
      queryByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
    ).toBeNull();
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with MONEY_TRANSFER_MONEY_SHEET bottom_sheet_name', () => {
      renderWithProvider(<MoneyTransferSheet />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_TRANSFER_MONEY_SHEET,
      });
    });

    it('calls trackBottomSheetViewed on mount', () => {
      renderWithProvider(<MoneyTransferSheet />);

      expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
    });

    it('calls trackSurfaceClicked with BETWEEN_ACCOUNTS component when "Another account" is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

      fireEvent.press(
        getByTestId(MoneyTransferSheetTestIds.BETWEEN_ACCOUNTS_OPTION),
      );

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith(
        expect.objectContaining({
          component_name:
            COMPONENT_NAMES.MONEY_TRANSFER_MONEY_SHEET_BETWEEN_ACCOUNTS,
          redirect_target: SCREEN_NAMES.MONEY_TRANSFER,
        }),
      );
    });

    it('calls trackSurfaceClicked with PERPS_ACCOUNT component when "Perps account" is pressed', () => {
      (useMoneyPerpsDeposit as jest.Mock).mockReturnValue({
        isEnabled: true,
        initiatePerpsDeposit: mockInitiatePerpsDeposit,
      });

      const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

      fireEvent.press(
        getByTestId(MoneyTransferSheetTestIds.PERPS_ACCOUNT_OPTION),
      );

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name:
          COMPONENT_NAMES.MONEY_TRANSFER_MONEY_SHEET_PERPS_ACCOUNT,
        redirect_target: SCREEN_NAMES.MONEY_TRANSFER,
      });
    });

    it('calls trackSurfaceClicked with PREDICTIONS_ACCOUNT component when "Predictions account" is pressed', () => {
      (useMoneyPredictDeposit as jest.Mock).mockReturnValue({
        isEnabled: true,
        initiatePredictDeposit: mockInitiatePredictDeposit,
      });

      const { getByTestId } = renderWithProvider(<MoneyTransferSheet />);

      fireEvent.press(
        getByTestId(MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION),
      );

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name:
          COMPONENT_NAMES.MONEY_TRANSFER_MONEY_SHEET_PREDICTIONS_ACCOUNT,
        redirect_target: SCREEN_NAMES.MONEY_TRANSFER,
      });
    });
  });
});
