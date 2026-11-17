import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { lightTheme, darkTheme } from '@metamask/design-tokens';

import { strings } from '../../../../../../../locales/i18n';
import { ThemeContext } from '../../../../../../util/theme';
import SecurityAttribution from './SecurityAttribution';
import { SecurityAttributionSelectors } from './SecurityAttribution.testIds';

const TEST_ID = 'scan-meta';

const PROVIDER = strings(
  'token_details_v1.security_tab.checks_meta.attribution',
);
const ageClause = (count: number) =>
  strings('token_details_v1.security_tab.checks_meta.age_clause', { count });
const JUST_NOW = strings(
  'token_details_v1.security_tab.checks_meta.age_clause_just_now',
);

const renderAttribution = (
  fetchedMinutesAgo: number | null,
  theme = lightTheme,
  onPress?: () => void,
) =>
  render(
    <ThemeContext.Provider value={theme}>
      <SecurityAttribution
        fetchedMinutesAgo={fetchedMinutesAgo}
        testID={TEST_ID}
        onPress={onPress}
      />
    </ThemeContext.Provider>,
  );

describe('SecurityAttribution', () => {
  it('renders the age clause when the payload has an age', () => {
    const { getByTestId } = renderAttribution(5);

    expect(getByTestId(TEST_ID)).toHaveTextContent(ageClause(5));
  });

  // Keeps the row the same shape as a minute later, rather than having the
  // clause appear underneath the user mid-read.
  it('reads "just now" below one minute', () => {
    const { getByTestId } = renderAttribution(0);

    expect(getByTestId(TEST_ID)).toHaveTextContent(JUST_NOW);
  });

  it('omits the age clause when nothing has been fetched', () => {
    const { getByTestId } = renderAttribution(null);

    expect(getByTestId(TEST_ID)).toHaveTextContent('');
  });

  it('names the provider and the age for screen readers', () => {
    const { getByTestId } = renderAttribution(5);

    // The provider is a logo with no text, so the label is the only place a
    // screen reader can learn who produced the checks above.
    expect(getByTestId(TEST_ID)).toHaveProp(
      'accessibilityLabel',
      `${PROVIDER} ${ageClause(5)}`,
    );
  });

  it('names the provider alone when nothing has been fetched', () => {
    const { getByTestId } = renderAttribution(null);

    expect(getByTestId(TEST_ID)).toHaveProp('accessibilityLabel', PROVIDER);
  });

  // The logo paints with `currentColor`, so a colour matching the background
  // renders an empty row rather than failing anything. `tw.color('text-...')`
  // resolves the background scale and did exactly that, so pin the token.
  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ])('paints the logo in the %s theme text colour', (_label, theme) => {
    const { getByTestId } = renderAttribution(5, theme);

    expect(getByTestId(SecurityAttributionSelectors.LOGO)).toHaveProp(
      'color',
      theme.colors.text.default,
    );
    expect(getByTestId(SecurityAttributionSelectors.LOGO)).not.toHaveProp(
      'color',
      theme.colors.background.default,
    );
  });

  describe('the disclaimer affordance', () => {
    it('reports a tap anywhere on the row', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderAttribution(5, lightTheme, onPress);

      fireEvent.press(getByTestId(TEST_ID));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('trails the clause with an info glyph', () => {
      const { getByTestId } = renderAttribution(5, lightTheme, jest.fn());

      expect(
        getByTestId(SecurityAttributionSelectors.INFO_ICON),
      ).toBeOnTheScreen();
    });

    // The row is one accessibility element, so the label alone would announce
    // the provider and the age with no hint that anything sits behind them.
    it('announces itself as a button naming what it opens', () => {
      const { getByTestId } = renderAttribution(5, lightTheme, jest.fn());
      const row = getByTestId(TEST_ID);

      expect(row).toHaveProp('accessibilityRole', 'button');
      expect(row).toHaveProp(
        'accessibilityHint',
        strings('token_details_v1.security_tab.checks_meta.explainer.title'),
      );
    });

    // A surface with nowhere to mount the sheet renders the plain provenance
    // line, so an info glyph never promises an action that does nothing.
    it('stays a plain row without a handler', () => {
      const { getByTestId, queryByTestId } = renderAttribution(5);

      expect(queryByTestId(SecurityAttributionSelectors.INFO_ICON)).toBeNull();
      expect(getByTestId(TEST_ID)).not.toHaveProp(
        'accessibilityRole',
        'button',
      );
    });
  });
});
