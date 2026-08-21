import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextVariant } from '@metamask/design-system-react-native';
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../../../../util/haptics';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import { getPerpsProInputAccessoryID } from './PerpsProCompactInput';
import PerpsProSizeInput, {
  type PerpsProSizeInputProps,
} from './PerpsProSizeInput';

jest.mock('../../../../../../../util/haptics');

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

const createSizeSlider = (
  overrides: Partial<PerpsProSizeInputProps['sizeSlider']> = {},
): PerpsProSizeInputProps['sizeSlider'] => ({
  value: 25,
  maximumValue: 100,
  onValueChange: jest.fn(),
  onDragEnd: jest.fn(),
  onDragCancel: jest.fn(),
  ...overrides,
});

const createProps = (
  overrides: Partial<PerpsProSizeInputProps> = {},
): PerpsProSizeInputProps => {
  const { sizeSlider, ...rest } = overrides;
  return {
    value: '',
    onChangeText: jest.fn(),
    denomination: { unit: 'usd' },
    canToggleDenomination: true,
    onToggleDenomination: jest.fn(),
    sizeSlider: createSizeSlider(sizeSlider),
    availableBalance: '$500 available',
    onAddFundsPress: jest.fn(),
    ...rest,
  };
};

const renderInput = (overrides: Partial<PerpsProSizeInputProps> = {}) =>
  render(<PerpsProSizeInput {...createProps(overrides)} />);

describe('PerpsProSizeInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(playImpact).mockClear();
    jest.mocked(playSelection).mockClear();
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
    expect(playSelection).toHaveBeenCalledTimes(1);
  });

  it('plays PrimaryCTA when Add funds is pressed', () => {
    const onAddFundsPress = jest.fn();
    renderInput({ onAddFundsPress });

    fireEvent.press(screen.getByTestId(ids.ADD_FUNDS_BUTTON));

    expect(onAddFundsPress).toHaveBeenCalledTimes(1);
    expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);
  });

  it('does not play Add funds haptics when the action is disabled', () => {
    renderInput({ onAddFundsPress: undefined });

    expect(screen.getByTestId(ids.ADD_FUNDS_BUTTON)).toBeDisabled();
    expect(playImpact).not.toHaveBeenCalled();
  });

  it('disables the denomination toggle when conversion is unavailable', () => {
    renderInput({ canToggleDenomination: false });

    expect(screen.getByTestId(ids.SIZE_UNIT_BUTTON)).toBeDisabled();
  });

  it('uses the custom keyboard accessory without requesting a native Done key', () => {
    renderInput();

    expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp(
      'inputAccessoryViewID',
      getPerpsProInputAccessoryID(ids.SIZE_INPUT),
    );
    expect(screen.getByTestId(ids.SIZE_INPUT)).not.toHaveProp('returnKeyType');
    expect(screen.getByTestId(ids.SIZE_INPUT)).not.toHaveProp(
      'onSubmitEditing',
    );
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

  it('allocates the Figma line height to the amount input', () => {
    renderInput();

    expect(screen.getByTestId(ids.SIZE_FIELD)).toHaveStyle({
      height: 78,
    });
    expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp(
      'twClassName',
      expect.stringContaining('h-8'),
    );
    expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp(
      'textVariant',
      TextVariant.HeadingLg,
    );
  });

  it('keeps the compact slider section visible with Figma spacing', () => {
    renderInput();

    expect(screen.getByTestId(ids.SIZE_SLIDER_SECTION)).toHaveStyle({
      overflow: 'visible',
      paddingTop: 24,
      paddingBottom: 16,
      paddingLeft: 12,
      paddingRight: 12,
    });
  });

  it('uses the Figma footer row height and horizontal padding', () => {
    renderInput();

    expect(screen.getByTestId(ids.ADD_FUNDS_BUTTON)).toHaveStyle({
      height: 46,
      paddingLeft: 12,
      paddingRight: 12,
    });
  });

  it('passes the amount-domain slider model to PerpsSlider', () => {
    const onValueChange = jest.fn();
    const onDragEnd = jest.fn();
    renderInput({
      sizeSlider: createSizeSlider({
        value: 10,
        maximumValue: 43.55,
        onValueChange,
        onDragEnd,
      }),
    });
    const slider = screen.UNSAFE_getByType(host('PerpsSlider'));

    expect(slider).toHaveProp('value', 10);
    expect(slider).toHaveProp('maximumValue', 43.55);
    expect(slider).toHaveProp('step', 1);

    slider.props.onValueChange(20);
    slider.props.onDragEnd(20);

    expect(onValueChange).toHaveBeenCalledWith(20);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it('commits the slider preview when the touch is cancelled', () => {
    const onDragCancel = jest.fn();
    renderInput({ sizeSlider: createSizeSlider({ onDragCancel }) });

    fireEvent(screen.getByTestId(ids.SIZE_SLIDER_SECTION), 'touchCancel');

    expect(onDragCancel).toHaveBeenCalledTimes(1);
  });
});
