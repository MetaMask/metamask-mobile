import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsSelectionBottomSheet from './PerpsSelectionBottomSheet';
import { PerpsSelectionBottomSheetSelectorsIDs } from './PerpsSelectionBottomSheet.testIds';
import type {
  PerpsSelectionBottomSheetProps,
  PerpsSelectionOption,
} from './PerpsSelectionBottomSheet.types';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'navigation.close': 'Close',
      'perps.selection_sheet.save': 'Save',
    };
    return translations[key] || key;
  }),
}));

const OPTION_PREFIX = PerpsSelectionBottomSheetSelectorsIDs.OPTION;

const OPTIONS: PerpsSelectionOption[] = [
  {
    id: 'lighter',
    title: 'Lighter',
    tag: '50x max',
    description: '0.103% maker / 0.103% taker\n$747.9M open interest',
  },
  {
    id: 'hyperliquid',
    title: 'Hyperliquid',
    tag: '50x max',
    description: '0.113% maker / 0.143% taker\n$7.48B open interest',
  },
];

describe('PerpsSelectionBottomSheet', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  const renderSheet = (
    overrides: Partial<PerpsSelectionBottomSheetProps> = {},
  ) =>
    render(
      <PerpsSelectionBottomSheet
        title="Default exchange"
        description="Set a default exchange for all orders."
        options={OPTIONS}
        selectedOptionId="hyperliquid"
        onSave={mockOnSave}
        onClose={mockOnClose}
        {...overrides}
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, description and every option', () => {
    renderSheet();

    expect(screen.getByText('Default exchange')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsSelectionBottomSheetSelectorsIDs.DESCRIPTION),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Default exchange')).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        'Lighter, 50x max, 0.103% maker / 0.103% taker, $747.9M open interest',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Lighter')).toBeOnTheScreen();
    expect(screen.getByText('Hyperliquid')).toBeOnTheScreen();
    expect(screen.getAllByText('50x max')).toHaveLength(2);
    expect(screen.getByTestId(`${OPTION_PREFIX}-lighter`)).toBeOnTheScreen();
    expect(
      screen.getByTestId(`${OPTION_PREFIX}-hyperliquid`),
    ).toBeOnTheScreen();
  });

  it('omits the description when none is provided', () => {
    renderSheet({ description: undefined });

    expect(
      screen.queryByTestId(PerpsSelectionBottomSheetSelectorsIDs.DESCRIPTION),
    ).toBeNull();
  });

  it('renders options without tag or description', () => {
    renderSheet({ options: [{ id: 'plain', title: 'Plain option' }] });

    expect(screen.getByLabelText('Plain option')).toBeOnTheScreen();
    expect(screen.getByText('Plain option')).toBeOnTheScreen();
    expect(screen.queryByText('50x max')).toBeNull();
  });

  it('marks only the initially selected option as checked', () => {
    renderSheet();

    expect(screen.getByTestId(`${OPTION_PREFIX}-hyperliquid`)).toBeChecked();
    expect(screen.getByTestId(`${OPTION_PREFIX}-lighter`)).not.toBeChecked();
  });

  it('moves the selection when another option is pressed', () => {
    renderSheet();

    fireEvent.press(screen.getByTestId(`${OPTION_PREFIX}-lighter`));

    expect(screen.getByTestId(`${OPTION_PREFIX}-lighter`)).toBeChecked();
    expect(
      screen.getByTestId(`${OPTION_PREFIX}-hyperliquid`),
    ).not.toBeChecked();
  });

  it('selects an option when its radio button is pressed', () => {
    renderSheet();

    fireEvent.press(
      screen.getByTestId(`${OPTION_PREFIX}-lighter-radio`, {
        includeHiddenElements: true,
      }),
    );

    expect(screen.getByTestId(`${OPTION_PREFIX}-lighter`)).toBeChecked();
  });

  it('centers card content for a single-line description', () => {
    renderSheet();

    fireEvent(screen.getAllByText(/open interest/)[0], 'textLayout', {
      nativeEvent: { lines: [{}] },
    });

    expect(screen.getByTestId(`${OPTION_PREFIX}-lighter`)).toHaveStyle({
      alignItems: 'center',
    });
  });

  it('aligns card content to the top for a multi-line description', () => {
    renderSheet();

    fireEvent(screen.getAllByText(/open interest/)[0], 'textLayout', {
      nativeEvent: { lines: [{}, {}] },
    });

    expect(screen.getByTestId(`${OPTION_PREFIX}-lighter`)).toHaveStyle({
      alignItems: 'flex-start',
    });
  });

  it('does not call onSave until the save button is pressed', () => {
    renderSheet();

    fireEvent.press(screen.getByTestId(`${OPTION_PREFIX}-lighter`));

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave with the chosen option id when saving', () => {
    renderSheet();

    fireEvent.press(screen.getByTestId(`${OPTION_PREFIX}-lighter`));
    fireEvent.press(
      screen.getByTestId(PerpsSelectionBottomSheetSelectorsIDs.SAVE_BUTTON),
    );

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith('lighter');
  });

  it('calls onSave with the initial selection when nothing changed', () => {
    renderSheet();

    fireEvent.press(
      screen.getByTestId(PerpsSelectionBottomSheetSelectorsIDs.SAVE_BUTTON),
    );

    expect(mockOnSave).toHaveBeenCalledWith('hyperliquid');
  });

  it('disables saving while no option is selected', () => {
    renderSheet({ selectedOptionId: undefined });

    fireEvent.press(
      screen.getByTestId(PerpsSelectionBottomSheetSelectorsIDs.SAVE_BUTTON),
    );

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('enables saving once an option is picked', () => {
    renderSheet({ selectedOptionId: undefined });

    fireEvent.press(screen.getByTestId(`${OPTION_PREFIX}-lighter`));
    fireEvent.press(
      screen.getByTestId(PerpsSelectionBottomSheetSelectorsIDs.SAVE_BUTTON),
    );

    expect(mockOnSave).toHaveBeenCalledWith('lighter');
  });

  it('uses the custom save button label when provided', () => {
    renderSheet({ saveButtonLabel: 'Confirm' });

    expect(screen.getByText('Confirm')).toBeOnTheScreen();
    expect(screen.queryByText('Save')).toBeNull();
  });

  it('defaults the save button label to "Save"', () => {
    renderSheet();

    expect(screen.getByText('Save')).toBeOnTheScreen();
  });

  it('does not call onSave when the close button is pressed', () => {
    renderSheet();

    fireEvent.press(screen.getByTestId(OPTION_PREFIX + '-lighter'));
    fireEvent.press(
      screen.getByTestId(PerpsSelectionBottomSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockOnSave).not.toHaveBeenCalled();
  });
});
