import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import UkMigrationBottomSheet from './UkMigrationBottomSheet';
import { UkMigrationBottomSheetSelectors } from './UkMigrationBottomSheet.testIds';
import { formatUkMigrationDeadline } from '../../utils/formatUkMigrationDeadline';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardFlow, CardScreens } from '../../util/metrics';
import { useCardUkMigrationState } from '../../hooks/useCardUkMigrationState';

const mockOnCloseBottomSheet = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: () => ({}) }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

const remoteDeadline = new Date('2026-09-30T23:59:59.999Z');
const expectedDeadlineLabel = formatUkMigrationDeadline(remoteDeadline, {
  includeYear: true,
});

const mockStore = configureMockStore()({});

jest.mock('../../hooks/useCardUkMigrationState', () => ({
  useCardUkMigrationState: jest.fn(() => ({
    state: {
      phase: 'soft',
      isActive: true,
      deadline: new Date('2026-09-30T23:59:59.999Z'),
    },
    refresh: jest.fn(),
  })),
}));

jest.mock('../../hooks/useCardUkMigrationUpdateBadge', () => ({
  useCardUkMigrationUpdateBadge: jest.fn(() => 'warning'),
}));

const mockUseCardUkMigrationState = jest.mocked(useCardUkMigrationState);

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

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

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
    mockUseCardUkMigrationState.mockReturnValue({
      state: {
        phase: 'soft',
        isActive: true,
        deadline: remoteDeadline,
      },
      refresh: jest.fn(),
    });
  });

  it('renders title, description, steps, and actions', () => {
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(UkMigrationBottomSheetSelectors.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.TITLE),
    ).toHaveTextContent('Update your MetaMask Card');
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.DESCRIPTION),
    ).toHaveTextContent(new RegExp(expectedDeadlineLabel));
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

  it('uses description without deadline when deadline is missing', () => {
    mockUseCardUkMigrationState.mockReturnValue({
      state: {
        phase: 'soft',
        isActive: true,
        deadline: null,
      },
      refresh: jest.fn(),
    });

    const { getByTestId } = renderSheet();

    expect(
      getByTestId(UkMigrationBottomSheetSelectors.DESCRIPTION),
    ).toHaveTextContent(
      "We've switched to a new card provider. To keep spending without interruption, complete these steps.",
    );
  });

  it('tracks CARD_VIEWED once on mount with migration props', () => {
    renderSheet();

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      provider: 'baanx',
      flow: CardFlow.MIGRATION,
      migration_phase: 'grace_window',
      badge_reasons: ['card_migration'],
      screen: CardScreens.MIGRATION_UPDATE_SHEET,
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet and navigates to SignUp with fromMigration when Get started is pressed', () => {
    const { getByTestId } = renderSheet();
    mockAddProperties.mockClear();
    mockCreateEventBuilder.mockClear();
    mockTrackEvent.mockClear();

    fireEvent.press(
      getByTestId(UkMigrationBottomSheetSelectors.GET_STARTED_BUTTON),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ONBOARDING.ROOT, {
      screen: Routes.CARD.ONBOARDING.SIGN_UP,
      params: { fromMigration: true },
    });
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      provider: 'baanx',
      flow: CardFlow.MIGRATION,
      migration_phase: 'grace_window',
      badge_reasons: ['card_migration'],
      action: CardActions.MIGRATION_SHEET_GET_STARTED_BUTTON,
    });
  });

  it('closes the sheet when Remind me later is pressed', () => {
    const { getByTestId } = renderSheet();
    mockAddProperties.mockClear();
    mockCreateEventBuilder.mockClear();

    fireEvent.press(
      getByTestId(UkMigrationBottomSheetSelectors.REMIND_LATER_BUTTON),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockAddProperties).toHaveBeenCalledWith({
      provider: 'baanx',
      flow: CardFlow.MIGRATION,
      migration_phase: 'grace_window',
      badge_reasons: ['card_migration'],
      action: CardActions.MIGRATION_SHEET_REMIND_ME_LATER_BUTTON,
    });
  });

  it('closes the sheet when the close button is pressed', () => {
    const { getByTestId } = renderSheet();
    mockAddProperties.mockClear();

    fireEvent.press(getByTestId(UkMigrationBottomSheetSelectors.CLOSE_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockAddProperties).toHaveBeenCalledWith({
      provider: 'baanx',
      flow: CardFlow.MIGRATION,
      migration_phase: 'grace_window',
      badge_reasons: ['card_migration'],
      action: CardActions.MIGRATION_SHEET_CLOSE_BUTTON,
    });
  });
});
