// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

// Internal dependencies.
import CellBase from './CellBase';
import { SAMPLE_CELLBASE_PROPS } from './CellBase.constants';
import { CellModalSelectorsIDs } from '../../../../../../../e2e/selectors/Modals/CellModal.selectors';

describe('CellBase', () => {
  describe('CellBase Component', () => {
    const renderComponent = (props = {}) =>
      render(<CellBase {...SAMPLE_CELLBASE_PROPS} {...props} />);
    const SAMPLEVIEW_TESTID = 'sampleview';
    const SampleView = <View testID={SAMPLEVIEW_TESTID} />;

    it('should render CellBase component', () => {
      const { toJSON, queryByTestId } = renderComponent();
      expect(toJSON()).toMatchSnapshot();
      expect(queryByTestId(CellModalSelectorsIDs.BASE_AVATAR)).not.toBe(null);
      expect(queryByTestId(CellModalSelectorsIDs.BASE_TITLE)).not.toBe(null);
    });

    it('should render with correct title', () => {
      const { getByText } = renderComponent();
      expect(getByText(SAMPLE_CELLBASE_PROPS.title as string)).toBeDefined();
    });

    it('should render with correct title node', () => {
      const { getByTestId } = renderComponent({ title: SampleView });
      expect(getByTestId(SAMPLEVIEW_TESTID)).toBeDefined();
    });

    it('should render with correct secondaryText', () => {
      const { getByText } = renderComponent();
      expect(
        getByText(SAMPLE_CELLBASE_PROPS.secondaryText as string),
      ).toBeDefined();
    });

    it('should render with correct secondaryText node', () => {
      const { getByTestId } = renderComponent({ secondaryText: SampleView });
      expect(getByTestId(SAMPLEVIEW_TESTID)).toBeDefined();
    });

    it('should render with correct tertiaryText', () => {
      const { getByText } = renderComponent();
      expect(
        getByText(SAMPLE_CELLBASE_PROPS.tertiaryText as string),
      ).toBeDefined();
    });

    it('should render with correct tertiaryText node', () => {
      const { getByTestId } = renderComponent({ tertiaryText: SampleView });
      expect(getByTestId(SAMPLEVIEW_TESTID)).toBeDefined();
    });

    it('should render with correct tagLabel', () => {
      const { getByText } = renderComponent();
      expect(getByText(SAMPLE_CELLBASE_PROPS.tagLabel as string)).toBeDefined();
    });

    it('should render children correctly', () => {
      const { getByTestId } = renderComponent({ children: SampleView });
      expect(getByTestId(SAMPLEVIEW_TESTID)).toBeDefined();
    });
  });
});
