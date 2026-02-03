import axios from 'axios';
import { BrowserStackCredentials } from '../utils/BrowserStackCredentials.js';

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

      const credentials = BrowserStackCredentials.getCredentials();

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
    const credentials = BrowserStackCredentials.getCredentials();
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

  /**
   * Get network logs for a specific session
   * @param {string} buildId - The build hashed ID
   * @param {string} sessionId - The session ID
   * @returns {Promise<Object>} Network logs data
   */
  async getNetworkLogs(buildId, sessionId) {
    const credentials = BrowserStackCredentials.getCredentials();
    // eslint-disable-next-line no-undef
    const authHeader = Buffer.from(
      `${credentials.username}:${credentials.accessKey}`,
    ).toString('base64');

    const url = `https://api-cloud.browserstack.com/app-automate/builds/${buildId}/sessions/${sessionId}/networklogs`;

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
      console.error('Error getting network logs:', error.message);
      return null;
    }
  }

  /**
   * Fetch network logs for a session and return summary
   * @param {string} sessionId - The session ID
   * @returns {Promise<Object>} Network logs with summary
   */
  async fetchNetworkLogs(sessionId) {
    try {
      console.log('Fetching network logs from BrowserStack...');

      // Get session details first to extract buildId
      const sessionDetails = await this.getSessionDetails(sessionId);

      if (!sessionDetails?.buildId) {
        return {
          error: 'No build ID found in session details',
          logs: null,
          summary: null,
        };
      }

      // Fetch network logs using the buildId
      const networkLogs = await this.getNetworkLogs(
        sessionDetails.buildId,
        sessionId,
      );

      if (!networkLogs) {
        return {
          error: 'Failed to fetch network logs',
          logs: null,
          summary: null,
        };
      }

      // Extract summary from network logs
      const logs = networkLogs.logs || [];
      const summary = this.extractNetworkLogsSummary(logs);

      console.log(
        `Network logs fetched: ${logs.length} requests, ${summary.failedRequests} failed`,
      );

      return {
        logs,
        summary,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.log(`Failed to fetch network logs: ${error.message}`);
      return {
        error: `Failed to fetch network logs: ${error.message}`,
        logs: null,
        summary: null,
      };
    }
  }

  /**
   * Extract summary statistics from network logs
   * @param {Array} logs - Array of network log entries
   * @returns {Object} Summary statistics
   */
  extractNetworkLogsSummary(logs) {
    if (!logs || !Array.isArray(logs)) {
      return {
        totalRequests: 0,
        failedRequests: 0,
        byStatus: {},
        byMethod: {},
        avgResponseTime: 0,
        slowestRequests: [],
      };
    }

    const byStatus = {};
    const byMethod = {};
    let totalResponseTime = 0;
    let failedRequests = 0;
    const requestTimes = [];

    logs.forEach((log) => {
      // Count by status code
      const status = log.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;

      // Count failed requests (4xx, 5xx)
      if (status >= 400 || status === 'error') {
        failedRequests++;
      }

      // Count by method
      const method = log.method || 'unknown';
      byMethod[method] = (byMethod[method] || 0) + 1;

      // Track response times
      const responseTime = log.time || log.duration || 0;
      totalResponseTime += responseTime;
      requestTimes.push({
        url: log.url || log.request?.url || 'unknown',
        method,
        status,
        time: responseTime,
      });
    });

    // Sort by response time and get top 5 slowest
    const slowestRequests = requestTimes
      .sort((a, b) => b.time - a.time)
      .slice(0, 5)
      .map((req) => ({
        url: req.url.substring(0, 100), // Truncate long URLs
        method: req.method,
        status: req.status,
        time: `${req.time}ms`,
      }));

    return {
      totalRequests: logs.length,
      failedRequests,
      byStatus,
      byMethod,
      avgResponseTime:
        logs.length > 0 ? Math.round(totalResponseTime / logs.length) : 0,
      slowestRequests,
    };
  }
}
