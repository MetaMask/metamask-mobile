// Third party dependencies
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies
import Text from '../../components/Texts/Text';
import { mockTheme } from '../../../util/theme';

// Internal dependencies
import TagColored from './TagColored';
import {
  DEFAULT_TAGCOLORED_TEXTVARIANT,
  SAMPLE_TAGCOLORED_PROPS,
  TAGCOLORED_TESTID,
  TAGCOLORED_TEXT_TESTID,
} from './TagColored.constants';
import { TagColor } from './TagColored.types';

describe('TagColored', () => {
  it('should render TagColored', () => {
    const wrapper = render(<TagColored {...SAMPLE_TAGCOLORED_PROPS} />);
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId(TAGCOLORED_TESTID)).not.toBe(null);
  });

  it('should render children correctly when provided', () => {
    const testText = 'TagColored';
    const ChildrenComponent = () => <Text>{testText}</Text>;

    const { getByText } = render(
      <TagColored>
        <ChildrenComponent />
      </TagColored>,
    );

    expect(getByText(testText)).toBeDefined();
  });

  it('should render children correctly when a string is provided', () => {
    const testText = 'TagColored';

    const { getByText } = render(<TagColored>{testText}</TagColored>);

    expect(getByText(testText)).toBeDefined();
  });

  it('should render children with the right text variant if typeof children === string', () => {
    const testText = 'TagColored';

    const { getByText } = render(<TagColored>{testText}</TagColored>);

    expect(getByText(testText).props.style.fontSize).toBe(
      mockTheme.typography[DEFAULT_TAGCOLORED_TEXTVARIANT].fontSize,
    );
  });

  it('should render the correct default color on default', () => {
    const testText = 'TagColored';

    const { getByTestId } = render(<TagColored>{testText}</TagColored>);

    expect(getByTestId(TAGCOLORED_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.background.alternative,
    );
    expect(getByTestId(TAGCOLORED_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.text.alternative,
    );
  });

  it('should render the correct default color when given', () => {
    const testText = 'TagColored';

    const { getByTestId } = render(
      <TagColored color={TagColor.Default}>{testText}</TagColored>,
    );

    expect(getByTestId(TAGCOLORED_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.background.alternative,
    );
    expect(getByTestId(TAGCOLORED_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.text.alternative,
    );
  });

  it('should render the correct success color when given', () => {
    const testText = 'TagColored';

    const { getByTestId } = render(
      <TagColored color={TagColor.Success}>{testText}</TagColored>,
    );

    expect(getByTestId(TAGCOLORED_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.success.muted,
    );
    expect(getByTestId(TAGCOLORED_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.success.default,
    );
  });

  it('should render the correct info color when given', () => {
    const testText = 'TagColored';

    const { getByTestId } = render(
      <TagColored color={TagColor.Info}>{testText}</TagColored>,
    );

    expect(getByTestId(TAGCOLORED_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.primary.muted,
    );
    expect(getByTestId(TAGCOLORED_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.primary.default,
    );
  });

  it('should render the correct danger color when given', () => {
    const testText = 'TagColored';

    const { getByTestId } = render(
      <TagColored color={TagColor.Danger}>{testText}</TagColored>,
    );

    expect(getByTestId(TAGCOLORED_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.error.muted,
    );
    expect(getByTestId(TAGCOLORED_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.error.default,
    );
  });

  it('should render the correct warning color when given', () => {
    const testText = 'TagColored';

    const { getByTestId } = render(
      <TagColored color={TagColor.Warning}>{testText}</TagColored>,
    );

    expect(getByTestId(TAGCOLORED_TESTID).props.style.backgroundColor).toBe(
      mockTheme.colors.warning.muted,
    );
    expect(getByTestId(TAGCOLORED_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.warning.default,
    );
  });
});
