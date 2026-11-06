import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ToastContext } from '../../../../../component-library/components/Toast';
import ImmersveRevokeAllowanceSheet from './ImmersveRevokeAllowanceSheet';
import { ImmersveRevokeAllowanceSheetTestIds } from './ImmersveRevokeAllowanceSheet.testIds';
import { useImmersveFunding } from '../../hooks/useImmersveFunding';
import { UserCancelledError } from '../../hooks/useCardDelegation';
import { CardActions, CardEntryPoint } from '../../util/metrics';
import Engine from '../../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockGoBack = jest.fn();
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: mockCloseToast,
  },
};
let mockRouteParams:
  | {
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

jest.mock('../../hooks/useImmersveFunding', () => ({
  useImmersveFunding: jest.fn(),
}));

jest.mock('../../hooks/useFundingAccountName', () => ({
  useFundingAccountName: () => 'Account 1',
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    CardController: {
      fetchCardHomeData: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties.mockReturnValue({ build: mockBuild }),
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

const mockUseImmersveFunding = useImmersveFunding as jest.MockedFunction<
  typeof useImmersveFunding
>;

const renderSheet = () =>
  renderWithProvider(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <ImmersveRevokeAllowanceSheet />
    </ToastContext.Provider>,
  );

describe('ImmersveRevokeAllowanceSheet', () => {
  let mockRevokeFunding: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    mockRevokeFunding = jest.fn().mockResolvedValue('0xtx');
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    mockUseImmersveFunding.mockReturnValue({
      revokeFunding: mockRevokeFunding,
      isLoading: false,
      error: null,
      createFundingSource: jest.fn(),
      executeFunding: jest.fn(),
      buildApproveWrite: jest.fn(),
      createCard: jest.fn(),
    });
    (
      Engine.context.CardController.fetchCardHomeData as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it('renders title, description, and both buttons', () => {
    const { getByText, getByTestId, getAllByText } = renderSheet();

    expect(getAllByText('Unlink card')).toHaveLength(2);
    expect(
      getByText(
        "You'll no longer be able to make purchases with your card. Relink anytime.",
      ),
    ).toBeOnTheScreen();
    expect(getByText('Keep linked')).toBeOnTheScreen();
    expect(
      getByTestId(ImmersveRevokeAllowanceSheetTestIds.REVOKE_BUTTON),
    ).toHaveTextContent('Unlink card');
  });

  it('closes from X without revoking', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(ImmersveRevokeAllowanceSheetTestIds.CLOSE_BUTTON),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockRevokeFunding).not.toHaveBeenCalled();
  });

  it('closes from Keep linked without unlinking', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(ImmersveRevokeAllowanceSheetTestIds.KEEP_BUTTON),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockRevokeFunding).not.toHaveBeenCalled();
  });

  it('closes then revokes, refetches card home, and shows success toast', async () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(ImmersveRevokeAllowanceSheetTestIds.REVOKE_BUTTON),
    );

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        action: CardActions.REVOKE_ALLOWANCE_CONFIRM,
        entrypoint: CardEntryPoint.CARD_HOME_REVOKE_ALLOWANCE,
      }),
    );

    await waitFor(() => {
      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
      expect(mockRevokeFunding).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.CardController.fetchCardHomeData,
      ).toHaveBeenCalledWith({ force: true });
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'Account 1 was unlinked' }],
        }),
      );
    });
  });

  it('shows success toast when refetch fails after revoke', async () => {
    (
      Engine.context.CardController.fetchCardHomeData as jest.Mock
    ).mockRejectedValueOnce(new Error('refetch failed'));

    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(ImmersveRevokeAllowanceSheetTestIds.REVOKE_BUTTON),
    );

    await waitFor(() => {
      expect(mockRevokeFunding).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'Account 1 was unlinked' }],
        }),
      );
    });

    expect(mockShowToast).not.toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          { label: 'Something went wrong unlinking your account' },
        ],
      }),
    );
  });

  it('shows error toast when revoke fails', async () => {
    mockRevokeFunding.mockRejectedValue(new Error('network error'));

    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(ImmersveRevokeAllowanceSheetTestIds.REVOKE_BUTTON),
    );

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [
            { label: 'Something went wrong unlinking your account' },
          ],
        }),
      );
    });
  });

  it('dismisses the pending toast on user cancel without showing an error', async () => {
    mockRevokeFunding.mockRejectedValue(
      new UserCancelledError('User rejected the request'),
    );

    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(ImmersveRevokeAllowanceSheetTestIds.REVOKE_BUTTON),
    );

    await waitFor(() => {
      expect(mockRevokeFunding).toHaveBeenCalled();
    });

    // The pending toast has no timeout, so cancelling must close it explicitly.
    await waitFor(() => {
      expect(mockCloseToast).toHaveBeenCalled();
    });

    expect(mockShowToast).not.toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          { label: 'Something went wrong unlinking your account' },
        ],
      }),
    );
  });
});
