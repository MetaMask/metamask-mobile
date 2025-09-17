import axios from 'axios';
import { BrowserStackCredentials } from '../utils/BrowserStackCredentials.js';

const credentials = BrowserStackCredentials.getCredentials();

/**
 * Handler for BrowserStack app profiling data operations
 */
export class AppProfilingDataHandler {
  /**
   * Get session details from BrowserStack API
   * @param {string} sessionId - The session ID
   * @returns {Promise<Object|null>} Session details including buildId and session data
   */
  async getSessionDetails(sessionId) {
    try {
      const url = `https://api-cloud.browserstack.com/app-automate/sessions/${sessionId}.json`;

      const response = await axios.get(url, {
        auth: {
          username: credentials.username,
          password: credentials.accessKey,
        },
        timeout: 8000,
      });

      const sessionData = response.data.automation_session;

      const result = {
        buildId: sessionData.build_hashed_id,
        sessionData,
        profilingData: sessionData.app_profiling || null,
      };
      return result;
    } catch (error) {
      console.error('Error getting session details:', error);
      return null;
    }
  }

  /**
   * Get app profiling data v2 for a specific session
   * @param {string} buildId - The build hashed ID (not the build name)
   * @param {string} sessionId - The session ID
   * @returns {Promise<Object>} App profiling data
   */
  async getAppProfilingData(buildId, sessionId) {
    // eslint-disable-next-line no-undef
    const authHeader = Buffer.from(
      `${credentials.username}:${credentials.accessKey}`,
    ).toString('base64');

    const url = `https://api-cloud.browserstack.com/app-automate/builds/${buildId}/sessions/${sessionId}/appprofiling/v2`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorBody}`,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting app profiling data v2:', error);
      throw error;
    }
  }

  /**
   * Extract profiling summary from raw profiling data
   * @param {Object} profilingData - Raw profiling data from BrowserStack
   * @returns {Object} Processed profiling summary
   */
  extractProfilingSummary(profilingData) {
    try {
      if (!profilingData?.data?.['io.metamask']) {
        return { error: 'No profiling data available' };
      }

      const appData = profilingData.data['io.metamask'];
      const metrics = appData.metrics;

      return {
        status: appData.status || 'unknown',
        issues: appData.detected_issues?.length || 0,
        criticalIssues:
          appData.detected_issues?.filter((issue) => issue.type === 'error')
            .length || 0,
        cpu: {
          avg: metrics.cpu?.avg || 0,
          max: metrics.cpu?.max || 0,
          unit: profilingData.data.units?.cpu || '%',
        },
        memory: {
          avg: metrics.mem?.avg || 0,
          max: metrics.mem?.max || 0,
          unit: profilingData.data.units?.mem || 'MB',
        },
        battery: {
          total: metrics.batt?.total_batt_usage || 0,
          percentage: metrics.batt?.total_batt_usage_pct || 0,
          unit: profilingData.data.units?.batt || 'mAh',
        },
        diskIO: {
          reads: metrics.diskio?.total_reads || 0,
          writes: metrics.diskio?.total_writes || 0,
          unit: profilingData.data.units?.diskio || 'KB',
        },
        networkIO: {
          upload: metrics.networkio?.total_upload || 0,
          download: metrics.networkio?.total_download || 0,
          unit: profilingData.data.units?.networkio || 'KB',
        },
        uiRendering: {
          slowFrames: metrics.ui_rendering?.slow_frames_pct || 0,
          frozenFrames: metrics.ui_rendering?.frozen_frames_pct || 0,
          anrs: metrics.ui_rendering?.num_anrs || 0,
        },
      };
    } catch (error) {
      console.error('Error extracting profiling summary:', error);
      return {
        error: `Failed to extract profiling summary: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Fetch complete profiling data for a session (session details + profiling data)
   * @param {string} sessionId - The session ID
   * @returns {Promise<Object>} Complete profiling data including summary
   */
  async fetchCompleteProfilingData(sessionId) {
    try {
      console.log('Fetching profiling data from BrowserStack...');

      // Get session details first to extract buildId
      const sessionDetails = await this.getSessionDetails(sessionId);

      if (!sessionDetails?.buildId) {
        return {
          error: 'No build ID found in session details',
          sessionDetails: null,
          profilingData: null,
          profilingSummary: null,
        };
      }

      // Fetch profiling data using the buildId
      const profilingData = await this.getAppProfilingData(
        sessionDetails.buildId,
        sessionId,
      );

      let profilingSummary = null;
      if (profilingData) {
        // Extract profiling summary for easier reporting
        profilingSummary = this.extractProfilingSummary(profilingData);
        console.log(
          `Profiling data fetched: ${
            profilingSummary?.issues || 0
          } issues detected`,
        );
      }

      return {
        sessionDetails,
        profilingData,
        profilingSummary,
      };
    } catch (error) {
      console.log(`Failed to fetch profiling data: ${error.message}`);
      return {
        error: `Failed to fetch profiling data: ${error.message}`,
        sessionDetails: null,
        profilingData: null,
        profilingSummary: null,
      };
    }
  }

  /**
   * Check if BrowserStack credentials are available
   * @returns {boolean} True if credentials are available
   */
  hasCredentials() {
    return BrowserStackCredentials.hasCredentials();
  }
}
