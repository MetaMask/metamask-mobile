import React from 'react';
import { render } from '@testing-library/react-native';
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
) =>
  render(
    <ThemeContext.Provider value={theme}>
      <SecurityAttribution
        fetchedMinutesAgo={fetchedMinutesAgo}
        testID={TEST_ID}
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
});
