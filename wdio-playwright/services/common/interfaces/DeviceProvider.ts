export interface DeviceProvider {
  /**
   * Identifier for the Appium session. Can be undefined if the session was not created.
   */
  sessionId?: string;

  /**
   * Global setup validates the configuration.
   */
  globalSetup?(): Promise<void>;

  /**
   * Returns a driver instance.
   */
  getDriver(): Promise<unknown>;

  /**
   * Updates test details and test status.
   *
   * @param status of the test
   * @param reason for the test status
   * @param name of the test
   */
  syncTestDetails?: (details: {
    status?: string;
    reason?: string;
    name?: string;
  }) => Promise<void>;
}
