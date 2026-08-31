import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import UkMigrationBottomSheet from './UkMigrationBottomSheet';
import { UkMigrationBottomSheetSelectors } from './UkMigrationBottomSheet.testIds';

const mockOnCloseBottomSheet = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'card.uk_migration_bottom_sheet.title': 'Update your MetaMask Card',
      'card.uk_migration_bottom_sheet.description':
        "We've switched to a new card provider. To keep spending without interruption, complete these steps before Sep 30, 2026.",
      'card.uk_migration_bottom_sheet.steps.reverify_identity':
        'Re-verify your identity',
      'card.uk_migration_bottom_sheet.steps.get_new_card_number':
        'Get your new card number',
      'card.uk_migration_bottom_sheet.steps.convert_funds_usdc_base':
        'Convert your funds to USDC on Base',
      'card.uk_migration_bottom_sheet.get_started': 'Get started',
      'card.uk_migration_bottom_sheet.remind_me_later': 'Remind me later',
    };
    return map[key] || key;
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

describe('UkMigrationBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, description, steps, and actions', () => {
    const { getByTestId, getByText } = render(<UkMigrationBottomSheet />);

    expect(getByTestId(UkMigrationBottomSheetSelectors.CONTAINER)).toBeTruthy();
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.TITLE),
    ).toHaveTextContent('Update your MetaMask Card');
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.DESCRIPTION),
    ).toHaveTextContent(
      "We've switched to a new card provider. To keep spending without interruption, complete these steps before Sep 30, 2026.",
    );
    expect(getByText('Re-verify your identity')).toBeTruthy();
    expect(getByText('Get your new card number')).toBeTruthy();
    expect(getByText('Convert your funds to USDC on Base')).toBeTruthy();
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.GET_STARTED_BUTTON),
    ).toBeTruthy();
    expect(
      getByTestId(UkMigrationBottomSheetSelectors.REMIND_LATER_BUTTON),
    ).toBeTruthy();
  });

  it('closes the sheet when Get started is pressed', () => {
    const { getByTestId } = render(<UkMigrationBottomSheet />);

    fireEvent.press(
      getByTestId(UkMigrationBottomSheetSelectors.GET_STARTED_BUTTON),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet when Remind me later is pressed', () => {
    const { getByTestId } = render(<UkMigrationBottomSheet />);

    fireEvent.press(
      getByTestId(UkMigrationBottomSheetSelectors.REMIND_LATER_BUTTON),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet when the close button is pressed', () => {
    const { getByTestId } = render(<UkMigrationBottomSheet />);

    fireEvent.press(getByTestId(UkMigrationBottomSheetSelectors.CLOSE_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
