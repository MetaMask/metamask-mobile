import ActivationKeyForm from './ActivationKeyForm';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import Routes from '../../../../../../constants/navigation/Routes';
import { fireEvent, screen } from '@testing-library/react-native';

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
      setOptions: actualReactNavigation.useNavigation().setOptions,
    }),
  };
});

const mockOnSubmit = jest.fn();

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => ({
    onSubmit: mockOnSubmit,
  }),
}));

describe('AddActivationKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders correctly', () => {
    render(ActivationKeyForm);
    expect(screen.toJSON()).toMatchSnapshot();
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
