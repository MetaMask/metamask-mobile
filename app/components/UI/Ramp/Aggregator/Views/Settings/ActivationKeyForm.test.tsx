import ActivationKeyForm, {
  ACTIVATION_KEY_FORM_HEADER_TEST_ID,
} from './ActivationKeyForm';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import Routes from '../../../../../../constants/navigation/Routes';
import { fireEvent, screen, within } from '@testing-library/react-native';

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.ACTIVATION_KEY_FORM,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}
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

const mockOnSubmit = jest.fn();

let mockUseParamsValue: {
  onSubmit: jest.Mock;
  key?: string;
  label?: string;
  active?: boolean;
} = {
  onSubmit: mockOnSubmit,
};

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParamsValue,
}));

describe('AddActivationKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParamsValue = { onSubmit: mockOnSubmit };
  });

  it('renders correctly', () => {
    render(ActivationKeyForm);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders inline header with title Add activation key', () => {
    render(ActivationKeyForm);
    const header = screen.getByTestId(ACTIVATION_KEY_FORM_HEADER_TEST_ID);
    expect(header).toBeOnTheScreen();
    expect(within(header).getByText('Add activation key')).toBeOnTheScreen();
  });

  it('renders inline header with title Edit activation key when key param is provided', () => {
    mockUseParamsValue = {
      onSubmit: mockOnSubmit,
      key: 'existing-key',
      label: 'My Key',
      active: true,
    };
    render(ActivationKeyForm);
    const header = screen.getByTestId(ACTIVATION_KEY_FORM_HEADER_TEST_ID);
    expect(within(header).getByText('Edit activation key')).toBeOnTheScreen();
  });

  it('navigates back when header back button is pressed', () => {
    render(ActivationKeyForm);
    const header = screen.getByTestId(ACTIVATION_KEY_FORM_HEADER_TEST_ID);
    const backButton = within(header).getByTestId('button-icon');
    fireEvent.press(backButton);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('has button disabled when input is empty', () => {
    render(ActivationKeyForm);
    const addButton = screen.getByRole('button', { name: 'Add' });
    expect(addButton.props.disabled).toBe(true);
  });

  it('navigates back when pressing cancel', () => {
    render(ActivationKeyForm);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls onSubmit with a valid test key', () => {
    const validKey = 'valid-key';
    render(ActivationKeyForm);
    const textInput = screen.getByPlaceholderText(
      'Paste or type an activation key',
    );
    fireEvent.changeText(textInput, validKey);
    const addButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.press(addButton);
    expect(mockOnSubmit).toHaveBeenCalledWith(validKey, '', undefined);
  });

  it('does not call onSubmit with an ivalid test key', () => {
    const invalidKey = 'invalid-key!!';
    render(ActivationKeyForm);
    const textInput = screen.getByPlaceholderText(
      'Paste or type an activation key',
    );
    fireEvent.changeText(textInput, invalidKey);
    const addButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.press(addButton);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
