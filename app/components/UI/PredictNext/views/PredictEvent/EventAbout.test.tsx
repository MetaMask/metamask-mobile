import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { EventAbout } from './EventAbout';
import { EventAboutTestIds } from './EventAbout.testIds';

const CANONICAL_DESCRIPTION = 'This event covers whether the team wins.';
const EVENT_RULES = 'Resolves from the official league result.';
const LONG_DESCRIPTION = `${'The event description continues. '.repeat(12).trim()}`;

describe('EventAbout', () => {
  it('renders only the canonical Event description', () => {
    render(<EventAbout description={CANONICAL_DESCRIPTION} />);

    expect(screen.getByTestId(EventAboutTestIds.TITLE)).toHaveTextContent(
      strings('predict.event.description'),
    );
    expect(screen.getByTestId(EventAboutTestIds.DESCRIPTION)).toHaveTextContent(
      CANONICAL_DESCRIPTION,
    );
    expect(screen.queryByTestId(EventAboutTestIds.RULES_CARD)).toBeNull();
    expect(
      screen.queryByText(strings('predict.rules.market_title')),
    ).toBeNull();
  });

  it('renders Event rules in a separate card', () => {
    render(
      <EventAbout description={CANONICAL_DESCRIPTION} rules={EVENT_RULES} />,
    );

    expect(screen.getByTestId(EventAboutTestIds.DESCRIPTION)).toHaveTextContent(
      CANONICAL_DESCRIPTION,
    );
    expect(screen.getByTestId(EventAboutTestIds.RULES_TITLE)).toHaveTextContent(
      strings('predict.rules.title'),
    );
    expect(screen.getByTestId(EventAboutTestIds.RULES)).toHaveTextContent(
      EVENT_RULES,
    );
    expect(
      screen.getByTestId(EventAboutTestIds.DESCRIPTION_CARD),
    ).not.toHaveTextContent(EVENT_RULES);
    expect(
      screen.getByTestId(EventAboutTestIds.RULES_CARD),
    ).not.toHaveTextContent(CANONICAL_DESCRIPTION);
  });

  it('omits the section when description and rules are missing', () => {
    render(<EventAbout />);

    expect(screen.queryByTestId(EventAboutTestIds.SECTION)).toBeNull();
  });

  it('omits the section when description and rules are whitespace', () => {
    render(<EventAbout description="   " rules="   " />);

    expect(screen.queryByTestId(EventAboutTestIds.SECTION)).toBeNull();
  });

  it('renders a rules card when only Event rules are available', () => {
    render(<EventAbout rules={EVENT_RULES} />);

    expect(screen.getByTestId(EventAboutTestIds.RULES)).toHaveTextContent(
      EVENT_RULES,
    );
    expect(screen.queryByTestId(EventAboutTestIds.DESCRIPTION_CARD)).toBeNull();
  });

  it('renders a long description in full', () => {
    render(<EventAbout description={LONG_DESCRIPTION} />);

    expect(screen.getByTestId(EventAboutTestIds.DESCRIPTION)).toHaveTextContent(
      LONG_DESCRIPTION,
    );
  });

  it('exposes the description heading to assistive technology', () => {
    render(<EventAbout description={CANONICAL_DESCRIPTION} />);

    expect(screen.getByTestId(EventAboutTestIds.TITLE)).toHaveProp(
      'accessibilityRole',
      'header',
    );
    expect(
      screen.getByRole('header', {
        name: strings('predict.event.description'),
      }),
    ).toBeOnTheScreen();
  });
});
