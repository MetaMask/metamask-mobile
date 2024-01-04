/**
 * Saves an onboarding analytics event in state
 *
 * @param {object} event - Event object
 */
export function saveOnboardingEvent(event) {
  return {
    type: 'SAVE_EVENT',
    event,
  };
}

/**
 * Erases any event stored in state
 */
export function clearOnboardingEvents() {
  return {
    type: 'CLEAR_EVENTS',
  };
}

export function setOnboardingStrategy(strategy) {
  console.log({ strategy });
  return {
    type: 'SET_STRATEGY',
    strategy,
  };
}
