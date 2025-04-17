///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React from 'react';
import { render } from '@testing-library/react-native';
import SnapUIInfoRow, { RowVariant } from './SnapUIInfoRow';
import Text from '../../../component-library/components/Texts/Text';
import { View } from 'react-native';

describe('SnapUIInfoRow', () => {
  it('renders correctly with default props', () => {
    const { getByTestId, getByText } = render(
      <SnapUIInfoRow label="Test Label" testID="test-row">
        Test Value
      </SnapUIInfoRow>,
    );

    expect(getByTestId('test-row')).toBeDefined();
    expect(getByTestId('snap-ui-info-row-label')).toBeTruthy();
    expect(getByTestId('snap-ui-info-row-value')).toBeTruthy();
    expect(getByText('Test Label')).toBeTruthy();
    expect(getByText('Test Value')).toBeTruthy();
  });

  it('renders correctly with critical variant', () => {
    const { getByTestId, getByText } = render(
      <SnapUIInfoRow label="Error Label" variant={RowVariant.Critical}>
        Error Value
      </SnapUIInfoRow>,
    );

    const label = getByTestId('snap-ui-info-row-label');
    const value = getByTestId('snap-ui-info-row-value');

    expect(getByTestId('snap-ui-info-row')).toBeTruthy();
    expect(label).toBeTruthy();
    expect(value).toBeTruthy();
    expect(getByText('Error Label')).toBeTruthy();
    expect(getByText('Error Value')).toBeTruthy();
  });

  it('renders correctly with warning variant', () => {
    const { getByTestId, getByText } = render(
      <SnapUIInfoRow label="Warning Label" variant={RowVariant.Warning}>
        Warning Value
      </SnapUIInfoRow>,
    );

    expect(getByTestId('snap-ui-info-row')).toBeTruthy();
    expect(getByTestId('snap-ui-info-row-label')).toBeTruthy();
    expect(getByTestId('snap-ui-info-row-value')).toBeTruthy();
    expect(getByText('Warning Label')).toBeTruthy();
    expect(getByText('Warning Value')).toBeTruthy();
  });

  it('renders correctly with string variant values', () => {
    const { getByTestId, getByText } = render(
      <SnapUIInfoRow label="String Variant Label" variant="critical">
        String Variant Value
      </SnapUIInfoRow>,
    );

    expect(getByTestId('snap-ui-info-row')).toBeTruthy();
    expect(getByTestId('snap-ui-info-row-label')).toBeTruthy();
    expect(getByTestId('snap-ui-info-row-value')).toBeTruthy();
    expect(getByText('String Variant Label')).toBeTruthy();
    expect(getByText('String Variant Value')).toBeTruthy();
  });

  it('renders nested Text components correctly', () => {
    const { getByTestId } = render(
      <SnapUIInfoRow label="Nested Text" variant={RowVariant.Critical}>
        <Text testID="nested-text">This is nested text</Text>
      </SnapUIInfoRow>,
    );

    expect(getByTestId('snap-ui-info-row-children-container')).toBeTruthy();
    expect(getByTestId('nested-text')).toBeTruthy();
  });

  it('renders correctly with tooltip', () => {
    const onTooltipPressMock = jest.fn();
    const { getByTestId, getByText } = render(
      <SnapUIInfoRow
        label="Tooltip Label"
        tooltip="This is a tooltip"
        onTooltipPress={onTooltipPressMock}
        variant={RowVariant.Default}
      >
        Tooltip Value
      </SnapUIInfoRow>,
    );

    expect(getByTestId('snap-ui-info-row')).toBeTruthy();
    expect(getByTestId('snap-ui-info-row-tooltip-container')).toBeTruthy();
    expect(getByText('Tooltip Label')).toBeTruthy();
    expect(getByText('Tooltip Value')).toBeTruthy();
  });

  it('handles labelChildren prop correctly', () => {
    const { getByTestId, queryByTestId } = render(
      <SnapUIInfoRow
        label="Label with Custom Child"
        labelChildren={<View testID="custom-label-child" />}
        tooltip="This tooltip should not appear"
      >
        Some value
      </SnapUIInfoRow>,
    );

    expect(getByTestId('custom-label-child')).toBeTruthy();
    // Tooltip should not be rendered when labelChildren is provided
    expect(queryByTestId('snap-ui-info-row-tooltip-container')).toBeNull();
  });
});
///: END:ONLY_INCLUDE_IF
