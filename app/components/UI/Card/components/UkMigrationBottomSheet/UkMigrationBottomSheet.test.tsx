import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import UkMigrationBottomSheet from './UkMigrationBottomSheet';
import { UkMigrationBottomSheetSelectors } from './UkMigrationBottomSheet.testIds';
import { selectCardUkMigrationState } from '../../../../../selectors/featureFlagController/card';
import { formatUkMigrationDeadline } from '../../utils/formatUkMigrationDeadline';
import Routes from '../../../../../constants/navigation/Routes';

const mockOnCloseBottomSheet = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

const remoteDeadline = new Date('2026-09-30T23:59:59.999Z');
const expectedDeadlineLabel = formatUkMigrationDeadline(remoteDeadline, {
  includeYear: true,
});

const mockStore = configureMockStore()({});

jest.mock('../../../../../selectors/featureFlagController/card', () => ({
  ...jest.requireActual('../../../../../selectors/featureFlagController/card'),
  selectCardUkMigrationState: jest.fn(() => ({
    phase: 'soft',
    isActive: true,
    deadline: new Date('2026-09-30T23:59:59.999Z'),
    countries: ['GB'],
  })),
}));

const mockSelectCardUkMigrationState = jest.mocked(selectCardUkMigrationState);

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string, vars?: Record<string, string>) => {
    const map: Record<string, string> = {
      'card.uk_migration_bottom_sheet.title': 'Update your MetaMask Card',
      'card.uk_migration_bottom_sheet.description':
        "We've switched to a new card provider. To keep spending without interruption, complete these steps before {{deadline}}.",
      'card.uk_migration_bottom_sheet.description_no_deadline':
        "We've switched to a new card provider. To keep spending without interruption, complete these steps.",
      'card.uk_migration_bottom_sheet.steps.reverify_identity':
        'Re-verify your identity',
      'card.uk_migration_bottom_sheet.steps.get_new_card_number':
        'Get your new card number',
      'card.uk_migration_bottom_sheet.steps.convert_funds_usdc_base':
        'Convert your funds to USDC on Base',
      'card.uk_migration_bottom_sheet.get_started': 'Get started',
      'card.uk_migration_bottom_sheet.remind_me_later': 'Remind me later',
    };
    let value = map[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([name, replacement]) => {
        value = value.replace(`{{${name}}}`, replacement);
      });
    }
    return value;
  },
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
        onCloseBottomSheet: (cb?: () => void) => {
          mockOnCloseBottomSheet(cb);
          cb?.();
        },
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

const renderSheet = () =>
  render(
    <Provider store={mockStore}>
      <UkMigrationBottomSheet />
    </Provider>,
  );

describe('UkMigrationBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectCardUkMigrationState.mockReturnValue({
      phase: 'soft',
      isActive: true,
      deadline: remoteDeadline,
      countries: ['GB'],
    });
  });

  it('renders title, description, steps, and actions', () => {
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(UkMigrationBottomSheetSelectors.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.TITLE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.DESCRIPTION),
    ).toHaveTextContent(
      `We've switched to a new card provider. To keep spending without interruption, complete these steps before ${expectedDeadlineLabel}.`,
    );
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.STEPS),
    ).toBeOnTheScreen();
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.step(1)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.step(2)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.step(3)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.GET_STARTED_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.REMIND_LATER_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders description without a deadline when remote endDate is absent', () => {
    mockSelectCardUkMigrationState.mockReturnValue({
      phase: 'off',
      isActive: false,
      deadline: null,
      countries: ['GB'],
    });

    const { getByTestId } = renderSheet();

    expect(
      getByTestId(UkMigrationBottomSheetSelectors.DESCRIPTION),
    ).toHaveTextContent(
      "We've switched to a new card provider. To keep spending without interruption, complete these steps.",
    );
  });

  it('closes the sheet and navigates to SignUp with fromMigration when Get started is pressed', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(UkMigrationBottomSheetSelectors.GET_STARTED_BUTTON),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ONBOARDING.ROOT, {
      screen: Routes.CARD.ONBOARDING.SIGN_UP,
      params: { fromMigration: true },
    });
  });

  it('closes the sheet when Remind me later is pressed', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(UkMigrationBottomSheetSelectors.REMIND_LATER_BUTTON),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('closes the sheet when the close button is pressed', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(UkMigrationBottomSheetSelectors.CLOSE_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
