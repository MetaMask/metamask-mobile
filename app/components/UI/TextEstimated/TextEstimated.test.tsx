// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// External dependencies.
import { TextVariant } from '../../../component-library/components/Texts/Text/Text.types';

// Internal dependencies.
import TextEstimated from './TextEstimated';
import {
  TEXT_ESTIMATED_TEST_ID,
  TEST_SAMPLE_TEXT,
} from './TextEstimated.constants';

describe('TextEstimated - Snapshot', () => {
  it('should render default settings correctly', () => {
    const { toJSON } = render(
      <TextEstimated variant={TextVariant.HeadingSMRegular}>
        {TEST_SAMPLE_TEXT}
      </TextEstimated>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('TextEstimated', () => {
  it('should render TextEstimated', () => {
    render(
      <TextEstimated variant={TextVariant.HeadingSMRegular}>
        {TEST_SAMPLE_TEXT}
      </TextEstimated>,
    );
    const TextEstimatedComponent = screen.getByTestId(TEXT_ESTIMATED_TEST_ID);
    expect(TextEstimatedComponent).toBeTruthy();
  });
});
