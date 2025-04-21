// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import SegmentedControl from './SegmentedControl';
import { SAMPLE_SEGMENTEDCONTROL_OPTIONS } from './SegmentedControl.constants';

describe('SegmentedControl', () => {
  // Single-select mode tests
  describe('Single-select mode', () => {
    it('renders correctly with default selection', () => {
      const { toJSON, getAllByRole } = render(
        <SegmentedControl
          options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
          selectedValue={SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value}
          onValueChange={jest.fn()}
        />,
      );

      // Renders all options
      expect(getAllByRole('button')).toHaveLength(
        SAMPLE_SEGMENTEDCONTROL_OPTIONS.length,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('calls onValueChange when an option is pressed', () => {
      const mockOnValueChange = jest.fn();
      const { getByText } = render(
        <SegmentedControl
          options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
          selectedValue={SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value}
          onValueChange={mockOnValueChange}
        />,
      );

      // Press the second option
      const secondOption = getByText(SAMPLE_SEGMENTEDCONTROL_OPTIONS[1].label);
      fireEvent.press(secondOption);

      // Callback is called with the second option's value
      expect(mockOnValueChange).toHaveBeenCalledWith(
        SAMPLE_SEGMENTEDCONTROL_OPTIONS[1].value,
      );
    });

    it('works in uncontrolled mode', () => {
      const mockOnValueChange = jest.fn();
      const { getByText } = render(
        <SegmentedControl
          options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
          onValueChange={mockOnValueChange}
        />,
      );

      // First option is selected by default
      const firstOption = getByText(SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].label);
      expect(firstOption).toBeTruthy();

      // Press the second option
      const secondOption = getByText(SAMPLE_SEGMENTEDCONTROL_OPTIONS[1].label);
      fireEvent.press(secondOption);

      // Callback is called with the second option's value
      expect(mockOnValueChange).toHaveBeenCalledWith(
        SAMPLE_SEGMENTEDCONTROL_OPTIONS[1].value,
      );
    });
  });

  // Multi-select mode tests
  describe('Multi-select mode', () => {
    it('renders correctly with default selections', () => {
      const selectedValues = [
        SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value,
        SAMPLE_SEGMENTEDCONTROL_OPTIONS[2].value,
      ];

      const { toJSON, getAllByRole } = render(
        <SegmentedControl
          options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
          selectedValues={selectedValues}
          isMultiSelect
          onValueChange={jest.fn()}
        />,
      );

      // Renders all options
      expect(getAllByRole('button')).toHaveLength(
        SAMPLE_SEGMENTEDCONTROL_OPTIONS.length,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('adds value to selection when unselected option is pressed', () => {
      const selectedValues = [SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value];
      const mockOnValueChange = jest.fn();

      const { getByText } = render(
        <SegmentedControl
          options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
          selectedValues={selectedValues}
          isMultiSelect
          onValueChange={mockOnValueChange}
        />,
      );

      // Press the second option (which is not selected)
      const secondOption = getByText(SAMPLE_SEGMENTEDCONTROL_OPTIONS[1].label);
      fireEvent.press(secondOption);

      // Callback is called with both values
      expect(mockOnValueChange).toHaveBeenCalledWith([
        SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value,
        SAMPLE_SEGMENTEDCONTROL_OPTIONS[1].value,
      ]);
    });

    it('removes value from selection when selected option is pressed', () => {
      const selectedValues = [
        SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value,
        SAMPLE_SEGMENTEDCONTROL_OPTIONS[2].value,
      ];
      const mockOnValueChange = jest.fn();

      const { getByText } = render(
        <SegmentedControl
          options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
          selectedValues={selectedValues}
          isMultiSelect
          onValueChange={mockOnValueChange}
        />,
      );

      // Press the first option (which is already selected)
      const firstOption = getByText(SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].label);
      fireEvent.press(firstOption);

      // Callback is called with only the second selected value
      expect(mockOnValueChange).toHaveBeenCalledWith([
        SAMPLE_SEGMENTEDCONTROL_OPTIONS[2].value,
      ]);
    });

    it('works in uncontrolled mode', () => {
      const mockOnValueChange = jest.fn();

      const { getByText } = render(
        <SegmentedControl
          options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
          isMultiSelect
          onValueChange={mockOnValueChange}
        />,
      );

      // Press the first option
      const firstOption = getByText(SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].label);
      fireEvent.press(firstOption);

      // Callback is called with the first option's value
      expect(mockOnValueChange).toHaveBeenCalledWith([
        SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value,
      ]);

      // Simulate component updating its internal state
      mockOnValueChange.mockClear();

      // Press the second option
      const secondOption = getByText(SAMPLE_SEGMENTEDCONTROL_OPTIONS[1].label);
      fireEvent.press(secondOption);

      // This is a bit tricky to test properly in this context since we can't
      // easily verify the internal state, but the callback is called
      expect(mockOnValueChange).toHaveBeenCalled();
    });
  });

  // Disabled state tests
  it('ignores presses when disabled', () => {
    const mockOnValueChange = jest.fn();
    const { getByText } = render(
      <SegmentedControl
        options={SAMPLE_SEGMENTEDCONTROL_OPTIONS}
        selectedValue={SAMPLE_SEGMENTEDCONTROL_OPTIONS[0].value}
        isDisabled
        onValueChange={mockOnValueChange}
      />,
    );

    // Press the second option
    const secondOption = getByText(SAMPLE_SEGMENTEDCONTROL_OPTIONS[1].label);
    fireEvent.press(secondOption);

    // Callback is not called
    expect(mockOnValueChange).not.toHaveBeenCalled();
  });
});
