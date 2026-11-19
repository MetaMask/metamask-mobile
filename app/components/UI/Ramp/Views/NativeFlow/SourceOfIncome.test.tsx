import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import SourceOfIncome from './SourceOfIncome';
import { SOURCE_OF_INCOME_TEST_IDS } from './SourceOfIncome.testIds';
import { SOURCE_OF_INCOME_PREVIEW_PARAMS } from './micaPreviewFixtures';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: jest.fn(),
    }),
  };
});

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(
    () =>
      jest.requireActual('./micaPreviewFixtures')
        .SOURCE_OF_INCOME_PREVIEW_PARAMS,
  ),
}));

const render = () =>
  renderScreen(
    SourceOfIncome,
    { name: Routes.RAMP.SOURCE_OF_INCOME },
    { state: { engine: { backgroundState } } },
  );

const continueButton = () =>
  screen.getByTestId(SOURCE_OF_INCOME_TEST_IDS.CONTINUE_BUTTON);

const pickOption = (fieldTestId: string, value: string) => {
  fireEvent.press(screen.getByTestId(fieldTestId));
  const [, modalParams] = mockNavigate.mock.calls.at(-1);
  act(() => {
    modalParams.params.onSelect(value);
  });
};

describe('SourceOfIncome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders four fields with placeholders', () => {
    render();

    expect(screen.getByText('Expected monthly volume')).toBeOnTheScreen();
    expect(screen.getByText('Select source of funds')).toBeOnTheScreen();
    expect(screen.getByText('Select employment status')).toBeOnTheScreen();
    expect(screen.getByText('Select nationality')).toBeOnTheScreen();
  });

  it('opens the option picker with the field options', () => {
    render();

    fireEvent.press(
      screen.getByTestId(SOURCE_OF_INCOME_TEST_IDS.EMPLOYMENT_STATUS_FIELD),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.RAMP.MODALS.ID,
      expect.objectContaining({
        screen: Routes.RAMP.MODALS.OPTION_SELECTOR,
        params: expect.objectContaining({
          title: 'Employment status',
          options: SOURCE_OF_INCOME_PREVIEW_PARAMS.employmentStatusOptions,
        }),
      }),
    );
  });

  it('shows the selected option name in the field', () => {
    render();

    pickOption(
      SOURCE_OF_INCOME_TEST_IDS.EMPLOYMENT_STATUS_FIELD,
      'mid_level_employee',
    );

    expect(screen.getByText('Mid-Level Employee')).toBeOnTheScreen();
  });

  it('keeps Continue disabled until all four fields have values', () => {
    render();
    expect(continueButton()).toBeDisabled();

    fireEvent.changeText(
      screen.getByTestId(SOURCE_OF_INCOME_TEST_IDS.MONTHLY_VOLUME_INPUT),
      '1500',
    );
    pickOption(SOURCE_OF_INCOME_TEST_IDS.SOURCE_OF_FUNDS_FIELD, 'savings');
    pickOption(SOURCE_OF_INCOME_TEST_IDS.EMPLOYMENT_STATUS_FIELD, 'student');
    expect(continueButton()).toBeDisabled();

    pickOption(SOURCE_OF_INCOME_TEST_IDS.NATIONALITY_FIELD, 'DE');
    expect(continueButton()).toBeEnabled();

    fireEvent.press(continueButton());
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('strips non-digit characters from the monthly volume', () => {
    render();
    const input = screen.getByTestId(
      SOURCE_OF_INCOME_TEST_IDS.MONTHLY_VOLUME_INPUT,
    );

    fireEvent.changeText(input, '1,5a0');

    expect(input.props.value).toBe('150');
  });
});
