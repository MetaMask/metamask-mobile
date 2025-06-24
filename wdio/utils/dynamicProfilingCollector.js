/**
 * Dynamic profiling collector that automatically extracts session IDs from test output
 * and collects BrowserStack app profiling data
 */

const fs = require('fs');
const path = require('path');
const BrowserStackAPI = require('./browserstackApi');

/**
 * Extract session IDs from the test output by reading the console logs
 * @returns {Promise<string[]>} Array of session IDs
 */
async function extractSessionIdsFromOutput() {
  console.log('Extracting session IDs from test output...');
  
  const sessionIds = [];
  
  try {
    // Method 1: Try to get recent sessions from BrowserStack API
    const browserstackAPI = new BrowserStackAPI();
    
    // Get recent builds and sessions
    console.log('Fetching recent sessions from BrowserStack...');
    
    // We'll use the build name to find recent sessions
    const buildName = 'android app launch times tests';
    
    // Get sessions for the current build
    const sessions = await getRecentSessions(browserstackAPI, buildName);
    
    if (sessions && sessions.length > 0) {
      console.log(`Found ${sessions.length} recent sessions`);
      sessions.forEach(session => {
        const s = session.automation_session;
        sessionIds.push(s.hashed_id);
        console.log(`Session ID: ${s.hashed_id}, Status: ${s.status}, Created: ${s.created_at}`);
      });
    } else {
      console.log('No recent sessions found via API, trying alternative method...');
      
      // Method 2: Try to get all sessions from the build and filter by status
      const allSessions = await getAllSessionsFromBuild(browserstackAPI, buildName);
      if (allSessions && allSessions.length > 0) {
        console.log(`Found ${allSessions.length} total sessions in build`);
        allSessions.forEach(session => {
          const s = session.automation_session;
          sessionIds.push(s.hashed_id);
          console.log(`Session ID: ${s.hashed_id}, Status: ${s.status}, Created: ${s.created_at}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error extracting session IDs:', error);
  }
  
  return sessionIds;
}

/**
 * Get all sessions for a specific build (without time filtering)
 * @param {BrowserStackAPI} browserstackAPI - BrowserStack API instance
 * @param {string} buildName - Build name to search for
 * @returns {Promise<Array>} Array of all sessions
 */
async function getAllSessionsFromBuild(browserstackAPI, buildName) {
  try {
    // Get recent builds
    const builds = await browserstackAPI.getRecentBuilds();
    
    // Find the build with matching name
    const targetBuild = builds.find(build => 
      build.automation_build.name.toLowerCase().includes(buildName.toLowerCase())
    );
    
    if (!targetBuild) {
      console.log(`No build found with name containing: ${buildName}`);
      return [];
    }
    
    console.log(`Found build: ${targetBuild.automation_build.name} (${targetBuild.automation_build.hashed_id})`);
    
    // Get sessions for this build
    const sessions = await browserstackAPI.getBuildSessions(targetBuild.automation_build.hashed_id);
    
    // Return all sessions without time filtering
    console.log(`Found ${sessions.length} total sessions in the build`);
    return sessions;
    
  } catch (error) {
    console.error('Error getting all sessions from build:', error);
    return [];
  }
}

/**
 * Get recent sessions for a specific build
 * @param {BrowserStackAPI} browserstackAPI - BrowserStack API instance
 * @param {string} buildName - Build name to search for
 * @returns {Promise<Array>} Array of recent sessions
 */
async function getRecentSessions(browserstackAPI, buildName) {
  try {
    // Get recent builds
    const builds = await browserstackAPI.getRecentBuilds();
    
    // Find the build with matching name
    const targetBuild = builds.find(build => 
      build.automation_build.name.toLowerCase().includes(buildName.toLowerCase())
    );
    
    if (!targetBuild) {
      console.log(`No build found with name containing: ${buildName}`);
      return [];
    }
    
    console.log(`Found build: ${targetBuild.automation_build.name} (${targetBuild.automation_build.hashed_id})`);
    
    // Get sessions for this build
    const sessions = await browserstackAPI.getBuildSessions(targetBuild.automation_build.hashed_id);
    
    // Filter for recent sessions (last 30 minutes instead of 10)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentSessions = sessions.filter(session => {
      const s = session.automation_session;
      const sessionDate = new Date(s.created_at);
      return sessionDate > thirtyMinutesAgo;
    });
    
    console.log(`Found ${recentSessions.length} recent sessions in the last 30 minutes`);
    return recentSessions;
    
  } catch (error) {
    console.error('Error getting recent sessions:', error);
    return [];
  }
}

/**
 * Collect profiling data for the given session IDs
 * @param {string[]} sessionIds - Array of session IDs
 */
async function collectProfilingDataForSessions(sessionIds) {
  if (sessionIds.length === 0) {
    console.log('No session IDs to collect profiling data for');
    return;
  }
  
  console.log(`Collecting profiling data for ${sessionIds.length} sessions...`);
  
  const browserstackAPI = new BrowserStackAPI();
  
  for (const sessionId of sessionIds) {
    try {
      console.log(`\n=== Collecting data for session: ${sessionId} ===`);
      
      // Get session details
      console.log('Getting session details...');
      const sessionDetails = await browserstackAPI.getSessionDetails(sessionId);
      console.log('Session details received successfully');
      browserstackAPI.saveProfilingData(sessionDetails, `auto-session-details-${sessionId}.json`);
      
      // Extract build hashed ID
      const buildHashedId = sessionDetails.automation_session.build_hashed_id;
      console.log('Build hashed ID:', buildHashedId);
      
      // Get app profiling data v2
      try {
        console.log('Getting app profiling data v2...');
        const profilingDataV2 = await browserstackAPI.getAppProfilingData(buildHashedId, sessionId);
        console.log('App profiling data v2 received successfully');
        browserstackAPI.saveProfilingData(profilingDataV2, `auto-app-profiling-v2-${sessionId}.json`);
      } catch (v2Error) {
        console.log('App profiling v2 not available:', v2Error.message);
      }
      
      
      console.log(`✓ Completed collection for session: ${sessionId}`);
      
    } catch (error) {
      console.error(`Error collecting data for session ${sessionId}:`, error.message);
    }
  }
  
  console.log('\n=== Profiling data collection completed ===');
}

/**
 * Main function to collect profiling data dynamically
 */
async function collectProfilingDataFromOutput() {
  console.log('=== Starting dynamic profiling data collection ===');
  
  try {
    // Extract session IDs from test output
    const sessionIds = await extractSessionIdsFromOutput();
    
    if (sessionIds.length === 0) {
      console.log('No session IDs found. Profiling data collection skipped.');
      return;
    }
    
    // Collect profiling data for the found sessions
    await collectProfilingDataForSessions(sessionIds);
    
    console.log('=== Dynamic profiling data collection completed successfully ===');
    
  } catch (error) {
    console.error('Error in dynamic profiling data collection:', error);
    throw error;
  }
}

module.exports = {
  collectProfilingDataFromOutput,
  extractSessionIdsFromOutput,
  collectProfilingDataForSessions
}; 