class Performance {
  /**
   * Start profiling for a specific screen
   * @param {string} screenName - Name of the screen to profile
   */
  static async startProfiling(screenName) {
    await driver.execute('browserstack_executor: {"action": "startProfiling", "arguments": {"name": "' + screenName + '"}}');
  }

  /**
   * Stop profiling for the current screen
   * @param {string} screenName - Name of the screen that was being profiled
   */
  static async stopProfiling(screenName) {
    await driver.execute('browserstack_executor: {"action": "stopProfiling", "arguments": {"name": "' + screenName + '"}}');
  }

  /**
   * Get profiling data for a specific screen
   * @param {string} screenName - Name of the screen to get profiling data for
   * @returns {Promise<Object>} Profiling data
   */
  static async getProfilingData(screenName) {
    const response = await driver.execute('browserstack_executor: {"action": "getProfilingData", "arguments": {"name": "' + screenName + '"}}');
    return response.value;
  }
}

export default Performance; 