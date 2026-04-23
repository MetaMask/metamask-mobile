import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import StateSelector from './StateSelector';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { createStateSelectorModalNavigationDetails } from '../Modals/StateSelectorModal';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../Deposit/constants', () => ({
  US_STATES: [
    { code: 'CA', name: 'California' },
    { code: 'NY', name: 'New York' },
    { code: 'TX', name: 'Texas' },
  ],
}));

function render(
  props: Partial<React.ComponentProps<typeof StateSelector>> = {},
) {
  const Component = () => (
    <StateSelector
      label="State"
      onValueChange={props.onValueChange ?? jest.fn()}
      testID="state-selector"
      {...props}
    />
  );
  return renderScreen(
    Component,
    { name: 'StateSelector' },
    { state: { engine: { backgroundState } } },
  );
}

describe('StateSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders label and default placeholder when no value selected', () => {
    const { getByText } = render({ defaultValue: 'Select state' });
    expect(getByText('State')).toBeOnTheScreen();
    expect(getByText('Select state')).toBeOnTheScreen();
  });

  it('renders selected state name when value matches a known code', () => {
    const { getByText } = render({ selectedValue: 'CA' });
    expect(getByText('California')).toBeOnTheScreen();
  });

  it('falls back to defaultValue when selectedValue not in list', () => {
    const { getByText } = render({
      selectedValue: 'ZZ',
      defaultValue: 'Pick one',
    });
    expect(getByText('Pick one')).toBeOnTheScreen();
  });

  it('renders error text when error prop provided', () => {
    const { getByText } = render({ error: 'State required' });
    expect(getByText('State required')).toBeOnTheScreen();
  });

  it('does not render error text when error prop is undefined', () => {
    const { queryByText } = render({ error: undefined });
    expect(queryByText('State required')).not.toBeOnTheScreen();
  });

  it('applies placeholder style when no state selected', () => {
    const { getByText } = render({ defaultValue: 'Select state' });
    const placeholder = getByText('Select state');
    const flattened = Array.isArray(placeholder.props.style)
      ? Object.assign({}, ...placeholder.props.style.flat())
      : placeholder.props.style;
    expect(flattened).toEqual(
      expect.objectContaining({ color: expect.any(String) }),
    );
  });

  it('navigates to StateSelectorModal on press', () => {
    const onValueChange = jest.fn();
    const { getByTestId } = render({
      selectedValue: 'CA',
      onValueChange,
    });
    fireEvent.press(getByTestId('state-selector'));
    expect(mockNavigate).toHaveBeenCalledWith(
      ...createStateSelectorModalNavigationDetails({
        selectedState: 'CA',
        onStateSelect: onValueChange,
      }),
    );
  });
});
