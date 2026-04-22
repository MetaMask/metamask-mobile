// Third party dependencies
import React from 'react';
import { render, screen } from '@testing-library/react-native';

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
  it('renders with default props and matches snapshot', () => {
    const wrapper = render(<TagColored {...SAMPLE_TAGCOLORED_PROPS} />);

    expect(wrapper).toMatchSnapshot();
    expect(screen.getByTestId(TAGCOLORED_TESTID)).toBeOnTheScreen();
  });

  it('renders custom element children', () => {
    const testText = 'TagColored';
    const ChildrenComponent = () => <Text>{testText}</Text>;

    render(
      <TagColored>
        <ChildrenComponent />
      </TagColored>,
    );

    expect(screen.getByText(testText)).toBeOnTheScreen();
  });

  it('renders string children as label text', () => {
    const testText = 'TagColored';

    render(<TagColored>{testText}</TagColored>);

    expect(screen.getByText(testText)).toBeOnTheScreen();
  });

  it('uses default text variant for string children', () => {
    const testText = 'TagColored';

    render(<TagColored>{testText}</TagColored>);

    expect(screen.getByText(testText).props.style.fontSize).toBe(
      mockTheme.typography[DEFAULT_TAGCOLORED_TEXTVARIANT].fontSize,
    );
  });

  it('applies default background and text color when color not specified', () => {
    const testText = 'TagColored';

    render(<TagColored>{testText}</TagColored>);

    expect(
      screen.getByTestId(TAGCOLORED_TESTID).props.style.backgroundColor,
    ).toBe(mockTheme.colors.background.alternative);
    expect(screen.getByTestId(TAGCOLORED_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.text.alternative,
    );
  });

  it('applies default background and text color when color is Default', () => {
    const testText = 'TagColored';

    render(<TagColored color={TagColor.Default}>{testText}</TagColored>);

    expect(
      screen.getByTestId(TAGCOLORED_TESTID).props.style.backgroundColor,
    ).toBe(mockTheme.colors.background.alternative);
    expect(screen.getByTestId(TAGCOLORED_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.text.alternative,
    );
  });

  it('applies success background and text color when color is Success', () => {
    const testText = 'TagColored';

    render(<TagColored color={TagColor.Success}>{testText}</TagColored>);

    expect(
      screen.getByTestId(TAGCOLORED_TESTID).props.style.backgroundColor,
    ).toBe(mockTheme.colors.success.muted);
    expect(screen.getByTestId(TAGCOLORED_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.success.default,
    );
  });

  it('applies info background and text color when color is Info', () => {
    const testText = 'TagColored';

    render(<TagColored color={TagColor.Info}>{testText}</TagColored>);

    expect(
      screen.getByTestId(TAGCOLORED_TESTID).props.style.backgroundColor,
    ).toBe(mockTheme.colors.primary.muted);
    expect(screen.getByTestId(TAGCOLORED_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.primary.default,
    );
  });

  it('applies danger background and text color when color is Danger', () => {
    const testText = 'TagColored';

    render(<TagColored color={TagColor.Danger}>{testText}</TagColored>);

    expect(
      screen.getByTestId(TAGCOLORED_TESTID).props.style.backgroundColor,
    ).toBe(mockTheme.colors.error.muted);
    expect(screen.getByTestId(TAGCOLORED_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.error.default,
    );
  });

  it('applies warning background and text color when color is Warning', () => {
    const testText = 'TagColored';

    render(<TagColored color={TagColor.Warning}>{testText}</TagColored>);

    expect(
      screen.getByTestId(TAGCOLORED_TESTID).props.style.backgroundColor,
    ).toBe(mockTheme.colors.warning.muted);
    expect(screen.getByTestId(TAGCOLORED_TEXT_TESTID).props.style.color).toBe(
      mockTheme.colors.warning.default,
    );
  });

  it('applies labelProps style to text', () => {
    const testText = 'TagColored';

    render(
      <TagColored labelProps={{ style: { textTransform: 'none' } }}>
        {testText}
      </TagColored>,
    );

    const textStyle = screen.getByTestId(TAGCOLORED_TEXT_TESTID).props.style;
    expect(textStyle.textTransform).toBe('none');
  });

  it('merges labelProps style with tag text styles', () => {
    const testText = 'TagColored';

    render(
      <TagColored
        color={TagColor.Success}
        labelProps={{ style: { textTransform: 'capitalize' } }}
      >
        {testText}
      </TagColored>,
    );

    const textStyle = screen.getByTestId(TAGCOLORED_TEXT_TESTID).props.style;
    expect(textStyle.color).toBe(mockTheme.colors.success.default);
    expect(textStyle.textTransform).toBe('capitalize');
  });
});
