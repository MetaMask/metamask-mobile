import { createContext, useContext } from 'react';

/**
 * Carries the Perps section-priority eligibility captured once per homepage
 * visit, before section order is decided.
 *
 * It rides every `section_viewed` event rather than only the Perps section's,
 * because the Perps section enters the viewport immediately in treatment but
 * only after scrolling in control. Recording eligibility on the Perps event
 * alone would restrict the observable eligible-control group to users who
 * already scrolled to Perps — the behaviour the experiment measures.
 *
 * `undefined` means eligibility was not resolved for this visit and the
 * property is omitted from the event.
 */
export const PerpsPriorityEligibilityContext = createContext<
  boolean | undefined
>(undefined);

export const usePerpsPriorityEligibility = (): boolean | undefined =>
  useContext(PerpsPriorityEligibilityContext);
