import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import PerpsProSizeInput, {
  type PerpsProSizeInputProps,
} from './PerpsProSizeInput';

const mockInputFocus = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const MockReact = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');

  return {
    ...actual,
    Input: MockReact.forwardRef(
      (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        MockReact.useImperativeHandle(ref, () => ({ focus: mockInputFocus }));
        return MockReact.createElement(TextInput, props);
      },
    ),
  };
});

jest.mock('../../../../components/PerpsSlider', () => 'PerpsSlider');

const host = (name: string) => name as unknown as React.ComponentType<unknown>;
const ids = PerpsProOrderFormSelectorsIDs;

const createProps = (
  overrides: Partial<PerpsProSizeInputProps> = {},
): PerpsProSizeInputProps => ({
  value: '',
  onChangeText: jest.fn(),
  denomination: { unit: 'usd' },
  canToggleDenomination: true,
  onToggleDenomination: jest.fn(),
  balancePercentage: 25,
  onBalancePercentageChange: jest.fn(),
  availableBalance: '$500 available',
  onAddFundsPress: jest.fn(),
  ...overrides,
});

const renderInput = (overrides: Partial<PerpsProSizeInputProps> = {}) =>
  render(<PerpsProSizeInput {...createProps(overrides)} />);

describe('PerpsProSizeInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('focuses the input when the upper field is pressed', () => {
    renderInput();

    fireEvent.press(screen.getByTestId(ids.SIZE_FIELD));

    expect(mockInputFocus).toHaveBeenCalledTimes(1);
  });

  it('refocuses the input after the denomination toggle is pressed', () => {
    const onToggleDenomination = jest.fn();
    renderInput({ onToggleDenomination });

    fireEvent.press(screen.getByTestId(ids.SIZE_UNIT_BUTTON));

    expect(onToggleDenomination).toHaveBeenCalledTimes(1);
    expect(mockInputFocus).toHaveBeenCalledTimes(1);
  });

  it('disables the denomination toggle when conversion is unavailable', () => {
    renderInput({ canToggleDenomination: false });

    expect(screen.getByTestId(ids.SIZE_UNIT_BUTTON)).toBeDisabled();
  });

  it('uses the asset symbol in field and toggle accessibility text', () => {
    renderInput({ denomination: { unit: 'asset', symbol: 'BTC' } });

    expect(screen.getByTestId(ids.SIZE_FIELD)).toHaveAccessibleName(
      'Size (BTC)',
    );
    expect(screen.getByTestId(ids.SIZE_UNIT_BUTTON)).toHaveAccessibleName(
      'Switch size denomination: BTC',
    );
  });

  it('keeps the compact slider section visible with Figma spacing', () => {
    renderInput();

    expect(screen.getByTestId(ids.SIZE_SLIDER_SECTION)).toHaveStyle({
      overflow: 'visible',
      paddingTop: 24,
      paddingBottom: 16,
    });
  });

  it('passes value changes and drag completion to the slider', () => {
    const onBalancePercentageChange = jest.fn();
    const onBalancePercentageDragEnd = jest.fn();
    renderInput({
      onBalancePercentageChange,
      onBalancePercentageDragEnd,
    });
    const slider = screen.UNSAFE_getByType(host('PerpsSlider'));

    slider.props.onValueChange(50);
    slider.props.onDragEnd(50);

    expect(onBalancePercentageChange).toHaveBeenCalledWith(50);
    expect(onBalancePercentageDragEnd).toHaveBeenCalledTimes(1);
  });

  it('commits the slider preview when the touch is cancelled', () => {
    const onBalancePercentageDragCancel = jest.fn();
    renderInput({ onBalancePercentageDragCancel });

    fireEvent(screen.getByTestId(ids.SIZE_SLIDER_SECTION), 'touchCancel');

    expect(onBalancePercentageDragCancel).toHaveBeenCalledTimes(1);
  });
});
