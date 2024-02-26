// Third party dependencies
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies
import Text from '../../../components/Texts/Text';

// Internal dependencies
import BaseSelectableButton from './BaseSelectableButton';
import {
  SAMPLE_BASESELECTABLEBUTTON_PROPS,
  BASESELECTABLEBUTTON_TESTID,
  BASESELECTABLEBUTTON_PLACEHOLDER_TESTID,
  DEFAULT_BASESELECTABLEBUTTON_PLACEHOLDER_STRING,
} from './BaseSelectableButton.constants';

describe('BaseSelectableButton', () => {
  it('should render BaseSelectableButton', () => {
    const wrapper = render(
      <BaseSelectableButton {...SAMPLE_BASESELECTABLEBUTTON_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId(BASESELECTABLEBUTTON_TESTID)).not.toBe(null);
  });

  it('should render children correctly when provided', () => {
    const testText = 'BaseSelectableButton';
    const ChildrenComponent = () => <Text>{testText}</Text>;

    const { getByText } = render(
      <BaseSelectableButton>
        <ChildrenComponent />
      </BaseSelectableButton>,
    );

    expect(getByText(testText)).toBeDefined();
  });

  it('should render caretIconEl correctly when provided', () => {
    const testText = 'BaseSelectableButton';
    const CaretIconElComponent = () => <Text>{testText}</Text>;

    const { getByText } = render(
      <BaseSelectableButton caretIconEl={<CaretIconElComponent />} />,
    );

    expect(getByText(testText)).toBeDefined();
  });

  it('should render with disabled state when isDisabled prop is true', () => {
    const { getByTestId } = render(<BaseSelectableButton isDisabled />);
    expect(
      getByTestId(BASESELECTABLEBUTTON_TESTID).props.accessibilityState
        .disabled,
    ).toBe(true);
  });

  it('should render without disabled state when isDisabled prop is false', () => {
    const { getByTestId } = render(<BaseSelectableButton isDisabled={false} />);

    expect(
      getByTestId(BASESELECTABLEBUTTON_TESTID).props.accessibilityState
        .disabled,
    ).toBe(false);
  });

  it('should render with a default placeholder if no children is given', () => {
    const { queryByTestId, getByText } = render(<BaseSelectableButton />);
    expect(queryByTestId(BASESELECTABLEBUTTON_PLACEHOLDER_TESTID)).not.toBe(
      null,
    );
    expect(
      getByText(DEFAULT_BASESELECTABLEBUTTON_PLACEHOLDER_STRING),
    ).toBeDefined();
  });

  it('should render with a given placeholder if no children is given', () => {
    const testPlaceholderText = 'Placeholder text';
    const { queryByTestId, getByText } = render(
      <BaseSelectableButton placeholder={testPlaceholderText} />,
    );
    expect(queryByTestId(BASESELECTABLEBUTTON_PLACEHOLDER_TESTID)).not.toBe(
      null,
    );
    expect(getByText(testPlaceholderText)).toBeDefined();
  });
});
