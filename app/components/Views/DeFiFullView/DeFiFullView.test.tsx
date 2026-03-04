import { renderScreen } from '../../../util/test/renderWithProvider';
import DeFiFullView from './DeFiFullView';
import { useNavigation } from '@react-navigation/native';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = () => ({});
    return tw;
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../UI/DeFiPositions/DeFiPositionsList', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return function MockDeFiPositionsList() {
    return React.createElement(
      View,
      { testID: 'defi-positions-list' },
      React.createElement(Text, null, 'DeFi Positions List'),
    );
  };
});

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

describe('DeFiFullView', () => {
  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      goBack: mockGoBack,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  it('renders header with title and back button', () => {
    const { getByTestId } = renderScreen(DeFiFullView, {
      name: 'DeFiFullView',
    });

    expect(getByTestId('header')).toBeOnTheScreen();
    expect(getByTestId('header-title')).toBeOnTheScreen();
    expect(getByTestId('back-button')).toBeOnTheScreen();
  });

  it('renders DeFi positions list', () => {
    const { getByTestId } = renderScreen(DeFiFullView, {
      name: 'DeFiFullView',
    });

    expect(getByTestId('defi-positions-list')).toBeOnTheScreen();
  });

  it('calls goBack when back button is pressed', () => {
    const { getByTestId } = renderScreen(DeFiFullView, {
      name: 'DeFiFullView',
    });

    getByTestId('back-button').props.onPress();

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
