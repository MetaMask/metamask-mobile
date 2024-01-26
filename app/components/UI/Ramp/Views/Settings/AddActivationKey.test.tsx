import AddActivationKey from './AddActivationKey';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import Routes from '../../../../../constants/navigation/Routes';
import { fireEvent, screen } from '@testing-library/react-native';

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.ADD_ACTIVATION_KEY,
    },
    {
      state: {
        engine: {
          backgroundState: initialBackgroundState,
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

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: () => ({
    onSubmit: mockOnSubmit,
  }),
}));

describe('AddActivationKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders correctly', () => {
    render(AddActivationKey);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('has button disabled when input is empty', () => {
    render(AddActivationKey);
    const addButton = screen.getByRole('button', { name: 'Add' });
    expect(addButton.props.disabled).toBe(true);
  });

  it('navigates back when pressing cancel', () => {
    render(AddActivationKey);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls onSubmit with a valid test key', () => {
    const validKey = 'valid-key';
    render(AddActivationKey);
    const textInput = screen.getByPlaceholderText(
      'Paste or type an Activation Key',
    );
    fireEvent.changeText(textInput, validKey);
    const addButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.press(addButton);
    expect(mockOnSubmit).toHaveBeenCalledWith(validKey);
  });

  it('does not call onSubmit with an ivalid test key', () => {
    const invalidKey = 'invalid-key!!';
    render(AddActivationKey);
    const textInput = screen.getByPlaceholderText(
      'Paste or type an Activation Key',
    );
    fireEvent.changeText(textInput, invalidKey);
    const addButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.press(addButton);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
