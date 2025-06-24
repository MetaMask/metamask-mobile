/**
 * BrowserStack API utility for fetching session details and app profiling data
 */

const fs = require('fs');
const path = require('path');

class BrowserStackAPI {
  constructor() {
    this.username = process.env.BROWSERSTACK_USERNAME;
    this.accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
    this.baseUrl = 'https://api-cloud.browserstack.com';
    this.authHeader = Buffer.from(`${this.username}:${this.accessKey}`).toString('base64');
    
    if (!this.username || !this.accessKey) {
      throw new Error('BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY environment variables are required');
    }
  }

  /**
   * Get session details for a specific session
   * @param {string} sessionId - The session ID
   * @returns {Promise<Object>} Session details
   */
  async getSessionDetails(sessionId) {
    const url = `${this.baseUrl}/app-automate/sessions/${sessionId}.json`;
    console.log(`Getting session details from: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${this.authHeader}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Session details response status: ${response.status}`);

      if (!response.ok) {
        const errorBody = await response.text();
        console.log(`Session details error response: ${errorBody}`);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      }

      const data = await response.json();
      console.log(`Session details response data keys:`, Object.keys(data));
      return data;
    } catch (error) {
      console.error('Error getting session details:', error);
      throw error;
    }
  }

  /**
   * Get app profiling data v2 for a specific session
   * @param {string} buildId - The build hashed ID (not the build name)
   * @param {string} sessionId - The session ID
   * @returns {Promise<Object>} App profiling data
   */
  async getAppProfilingData(buildId, sessionId) {
    const url = `${this.baseUrl}/app-automate/builds/${buildId}/sessions/${sessionId}/appprofiling/v2`;
    console.log(`Getting app profiling data v2 from: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${this.authHeader}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`App profiling v2 response status: ${response.status}`);
      console.log(`App profiling v2 response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorBody = await response.text();
        console.log(`App profiling v2 error response: ${errorBody}`);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      }

      const data = await response.json();
      console.log(`App profiling v2 response data keys:`, Object.keys(data));
      return data;
    } catch (error) {
      console.error('Error getting app profiling data v2:', error);
      throw error;
    }
  }

  /**
   * Extract session information from session capabilities
   * @param {Object} sessionCapabilities - Session capabilities from driver
   * @returns {Object} Session info with sessionId and buildId
   */
  extractSessionInfo(sessionCapabilities) {
    // For BrowserStack, we need to get the session ID from the session details API
    // since the capabilities don't contain the actual BrowserStack session ID
    return {
      sessionId: sessionCapabilities.sessionId,
      buildId: sessionCapabilities['bstack:options']?.buildIdentifier || 
               sessionCapabilities.build ||
               sessionCapabilities['appium:build'],
      capabilities: sessionCapabilities
    };
  }

  /**
   * Extract the current BrowserStack session ID from test output
   * This looks for the session ID in the test output logs
   * @returns {string|null} The current session ID or null if not found
   */
  extractCurrentSessionId() {
    try {
      // Read the latest test output to find the current session ID
      const fs = require('fs');
      const path = require('path');
      
      // Look for session ID in common log locations
      const possibleLogFiles = [
        path.join(__dirname, '..', 'reports', 'wdio.log'),
        path.join(__dirname, '..', '..', 'wdio.log'),
        path.join(process.cwd(), 'wdio.log')
      ];
      
      for (const logFile of possibleLogFiles) {
        if (fs.existsSync(logFile)) {
          const logContent = fs.readFileSync(logFile, 'utf8');
          
          // Look for BrowserStack session ID patterns in the logs
          // Common patterns: "browserstack_session_id": "..." or "session_id": "..."
          const sessionIdMatch = logContent.match(/"browserstack_session_id":\s*"([^"]+)"/) ||
                                logContent.match(/"session_id":\s*"([^"]+)"/) ||
                                logContent.match(/session_id=([a-f0-9]+)/i) ||
                                logContent.match(/browserstack.*session.*([a-f0-9]{32,})/i);
          
          if (sessionIdMatch && sessionIdMatch[1]) {
            console.log(`Found session ID in logs: ${sessionIdMatch[1]}`);
            return sessionIdMatch[1];
          }
        }
      }
      
      console.log('No session ID found in log files');
      return null;
    } catch (error) {
      console.error('Error extracting session ID from logs:', error);
      return null;
    }
  }

  /**
   * Capture and store the current session ID for later use
   * This should be called during the test run when the session is active
   * @param {string} sessionId - The current session ID
   */
  captureCurrentSessionId(sessionId) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const sessionInfo = {
        sessionId: sessionId,
        capturedAt: new Date().toISOString()
      };
      
      const reportsDir = path.join(__dirname, '..', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const sessionFile = path.join(reportsDir, 'current-session.json');
      fs.writeFileSync(sessionFile, JSON.stringify(sessionInfo, null, 2));
      
      console.log(`Current session ID captured: ${sessionId}`);
    } catch (error) {
      console.error('Error capturing session ID:', error);
    }
  }

  /**
   * Get the captured current session ID
   * @returns {string|null} The captured session ID or null if not found
   */
  getCapturedSessionId() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const sessionFile = path.join(__dirname, '..', 'reports', 'current-session.json');
      
      if (fs.existsSync(sessionFile)) {
        const sessionInfo = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        console.log(`Retrieved captured session ID: ${sessionInfo.sessionId}`);
        return sessionInfo.sessionId;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting captured session ID:', error);
      return null;
    }
  }

  /**
   * Get app profiling data for the current session only
   * @returns {Promise<Object|null>} App profiling data for current session or null
   */
  async getCurrentSessionProfilingData() {
    try {
      // First try to get the captured session ID
      let currentSessionId = this.getCapturedSessionId();
      
      // If not captured, try to extract from logs
      if (!currentSessionId) {
        currentSessionId = this.extractCurrentSessionId();
      }
      
      if (!currentSessionId) {
        console.log('Could not determine current session ID, skipping profiling data collection');
        return null;
      }
      
      console.log(`Collecting profiling data for current session: ${currentSessionId}`);
      
      // Get session details to extract the build ID
      const sessionDetails = await this.getSessionDetails(currentSessionId);
      
      if (!sessionDetails || !sessionDetails.build_hashed_id) {
        console.log('Could not get session details or build ID');
        return null;
      }
      
      const buildId = sessionDetails.build_hashed_id;
      console.log(`Build ID: ${buildId}`);
      
      // Get app profiling data for this specific session
      const profilingData = await this.getAppProfilingData(buildId, currentSessionId);
      
      // Add metadata about the current session
      profilingData.currentSession = {
        sessionId: currentSessionId,
        buildId: buildId,
        collectedAt: new Date().toISOString()
      };
      
      return profilingData;
    } catch (error) {
      console.error('Error getting current session profiling data:', error);
      return null;
    }
  }

  /**
   * Save profiling data to a JSON file in the reports directory
   * @param {Object} data - The data to save
   * @param {string} filename - The filename to save as
   */
  saveProfilingData(data, filename) {
    const reportsDir = path.join(__dirname, '..', 'reports');
    
    // Create reports directory if it doesn't exist
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const filePath = path.join(reportsDir, filename);
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Data saved to: ${filePath}`);
    } catch (error) {
      console.error(`Error saving data to ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get recent builds from BrowserStack
   * @returns {Promise<Object>} Recent builds data
   */
  async getRecentBuilds() {
    const url = `${this.baseUrl}/app-automate/builds.json`;
    console.log(`Getting recent builds from: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${this.authHeader}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Recent builds response status: ${response.status}`);

      if (!response.ok) {
        const errorBody = await response.text();
        console.log(`Recent builds error response: ${errorBody}`);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      }

      const data = await response.json();
      console.log(`Recent builds response data keys:`, Object.keys(data));
      return data;
    } catch (error) {
      console.error('Error getting recent builds:', error);
      throw error;
    }
  }

  /**
   * Get sessions for a specific build
   * @param {string} buildId - The build hashed ID
   * @returns {Promise<Object>} Sessions data
   */
  async getBuildSessions(buildId) {
    const url = `${this.baseUrl}/app-automate/builds/${buildId}/sessions.json`;
    console.log(`Getting build sessions from: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${this.authHeader}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Build sessions response status: ${response.status}`);

      if (!response.ok) {
        const errorBody = await response.text();
        console.log(`Build sessions error response: ${errorBody}`);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      }

      const data = await response.json();
      console.log(`Build sessions response data keys:`, Object.keys(data));
      return data;
    } catch (error) {
      console.error('Error getting build sessions:', error);
      throw error;
    }
  }
}

module.exports = BrowserStackAPI; 