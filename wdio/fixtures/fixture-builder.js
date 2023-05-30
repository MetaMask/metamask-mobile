import * as initState from './init-state.json'

/**
 * FixtureBuilder class provides a fluent interface for building fixture data.
 */
class FixtureBuilder {
    constructor() {
      // Initialize an empty fixture
      this.fixture = {};
    }
  
    /**
     * Set the asyncState property of the fixture.
     * @param {any} asyncState - The value to set for asyncState.
     * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
     */
    withAsyncState(asyncState) {
      this.fixture.asyncState = asyncState;
      return this;
    }
  
    /**
     * Set the state property of the fixture.
     * @param {any} state - The value to set for state.
     * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
     */
    withState(state) {
      this.fixture.state = state;
      return this;
    }
  
    /**
     * Set the default fixture values.
     * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
     */
    withDefaultFixture() {
      this.fixture = {
        asyncState: initState?.asyncState,
        state: initState?.state,
      };
      return this;
    }
  
    /**
     * Set the fixture to an empty object for onboarding.
     * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
     */
    withOnboardingFixture() {
      this.fixture = {};
      return this;
    }
  
    /**
     * Build and return the fixture object.
     * @returns {Object} - The built fixture object.
     */
    build() {
      return this.fixture;
    }
  }

  module.exports = FixtureBuilder;
