/* eslint-disable react-native/no-inline-styles */
// Third party dependencies
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies
import Text from '../../components/Texts/Text';
import { mockTheme } from '../../../util/theme';

// Internal dependencies
import TagBase from './TagBase';
import {
  SAMPLE_TAGBASE_PROPS,
  TAGBASE_TESTID,
  TAGBASE_TEXT_TESTID,
} from './TagBase.constants';
import { TagShape, TagSeverity } from './TagBase.types';

describe('TagBase', () => {
  it('should render TagBase', () => {
    const wrapper = render(<TagBase {...SAMPLE_TAGBASE_PROPS} />);
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId(TAGBASE_TESTID)).not.toBe(null);
  });

  it('should render children correctly when provided', () => {
    const testText = 'TagBase';
    const ChildrenComponent = () => <Text>{testText}</Text>;

    const { getByText } = render(
      <TagBase>
        <ChildrenComponent />
      </TagBase>,
    );

    expect(getByText(testText)).toBeDefined();
  });

  it('should render children correctly when a string is provided', () => {
    const testText = 'TagBase';

    const { getByText } = render(<TagBase>{testText}</TagBase>);

    expect(getByText(testText)).toBeDefined();
  });

  it('should render the correct default shape on default', () => {
    const testText = 'TagBase';

    const { getByTestId } = render(<TagBase>{testText}</TagBase>);

    expect(getByTestId(TAGBASE_TESTID).props.style.borderRadius).toBe(999);
  });

  it('should render the correct shape when given', () => {
    const testText = 'TagBase';

    const { getByTestId } = render(
      <TagBase shape={TagShape.Rectangle}>{testText}</TagBase>,
    );

    expect(getByTestId(TAGBASE_TESTID).props.style.borderRadius).toBe(4);
  });

  it('should render the correct default color on default', () => {
    const testText = 'TagBase';

    const { getByTestId } = render(<TagBase>{testText}</TagBase>);

    expect(getByTestId(TAGBASE_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.background.default,
    );
    expect(getByTestId(TAGBASE_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.text.default,
    );
  });

  it('should render the correct default color when given', () => {
    const testText = 'TagBase';

    const { getByTestId } = render(
      <TagBase severity={TagSeverity.Default}>{testText}</TagBase>,
    );

    expect(getByTestId(TAGBASE_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.background.default,
    );
    expect(getByTestId(TAGBASE_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.text.default,
    );
  });

  it('should render the correct neutral color when given', () => {
    const testText = 'TagBase';

    const { getByTestId } = render(
      <TagBase severity={TagSeverity.Neutral}>{testText}</TagBase>,
    );

    expect(getByTestId(TAGBASE_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.background.alternative,
    );
    expect(getByTestId(TAGBASE_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.text.alternative,
    );
  });

  it('should render the correct success color when given', () => {
    const testText = 'TagBase';

    const { getByTestId } = render(
      <TagBase severity={TagSeverity.Success}>{testText}</TagBase>,
    );

    expect(getByTestId(TAGBASE_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.success.muted,
    );
    expect(getByTestId(TAGBASE_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.success.default,
    );
  });

  it('should render the correct info color when given', () => {
    const testText = 'TagBase';

    const { getByTestId } = render(
      <TagBase severity={TagSeverity.Info}>{testText}</TagBase>,
    );

    expect(getByTestId(TAGBASE_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.info.muted,
    );
    expect(getByTestId(TAGBASE_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.info.default,
    );
  });

  it('should render the correct danger color when given', () => {
    const testText = 'TagBase';

    const { getByTestId } = render(
      <TagBase severity={TagSeverity.Danger}>{testText}</TagBase>,
    );

    expect(getByTestId(TAGBASE_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.error.muted,
    );
    expect(getByTestId(TAGBASE_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.error.default,
    );
  });

  it('should render the correct warning color when given', () => {
    const testText = 'TagBase';

    const { getByTestId } = render(
      <TagBase severity={TagSeverity.Warning}>{testText}</TagBase>,
    );

    expect(getByTestId(TAGBASE_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.warning.muted,
    );
    expect(getByTestId(TAGBASE_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.warning.default,
    );
  });

  it('should not render the border on default', () => {
    const testText = 'TagBase';

    const { getByTestId } = render(<TagBase>{testText}</TagBase>);

    expect(getByTestId(TAGBASE_TESTID).props.style.borderWidth).toBe(0);
  });

  it('should not render the border if includesBorder is true', () => {
    const testText = 'TagBase';

    const { getByTestId } = render(
      <TagBase includesBorder>{testText}</TagBase>,
    );

    expect(getByTestId(TAGBASE_TESTID).props.style.borderWidth).toBe(1);
  });
});
