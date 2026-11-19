import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import OptionSelectorModal from './OptionSelectorModal';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

const mockGoBack = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  return {
    ...actual,
    BottomSheet: forwardRef(
      (
        {
          children,
          goBack,
        }: { children: React.ReactNode; goBack?: () => void },
        ref: React.Ref<unknown>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => {
            goBack?.();
            callback?.();
          },
          onOpenBottomSheet: (callback?: () => void) => {
            callback?.();
          },
        }));
        return <>{children}</>;
      },
    ),
  };
});

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: mockGoBack,
    }),
  };
});

const mockOnSelect = jest.fn();
let mockParams = {
  title: 'Employment status',
  options: [
    { name: 'Student', value: 'student' },
    { name: 'Retired', value: 'retired' },
    { name: 'Mid-Level Employee', value: 'mid_level_employee' },
  ],
  selectedValue: undefined as string | undefined,
  onSelect: mockOnSelect,
};

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockParams),
}));

const render = () =>
  renderScreen(
    OptionSelectorModal,
    { name: 'OptionSelectorModal' },
    { state: { engine: { backgroundState } } },
  );

describe('OptionSelectorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { ...mockParams, selectedValue: undefined };
  });

  it('renders the title and every option', () => {
    render();

    expect(screen.getByText('Employment status')).toBeOnTheScreen();
    expect(screen.getByText('Student')).toBeOnTheScreen();
    expect(screen.getByText('Retired')).toBeOnTheScreen();
    expect(screen.getByText('Mid-Level Employee')).toBeOnTheScreen();
  });

  it('calls onSelect with the option value and closes the sheet', () => {
    render();

    fireEvent.press(screen.getByText('Retired'));

    expect(mockOnSelect).toHaveBeenCalledWith('retired');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('marks the selected option', () => {
    mockParams = { ...mockParams, selectedValue: 'student' };
    render();

    const selectedMarkers = screen.getAllByRole('checkbox');
    expect(selectedMarkers).toHaveLength(1);
    expect(selectedMarkers[0].parent?.parent).toHaveTextContent('Student');
  });
});
