const { Given, When, Then } = require('@wdio/cucumber-framework');
const BrowserStackAPI = require('../utils/browserstackApi');

/**
 * Performance testing steps for BrowserStack app profiling
 */

Given('I capture the current BrowserStack session ID', async function() {
  try {
    const sessionCapabilities = await browser.getSession();
    const deviceUDID = sessionCapabilities.sessionId;
    
    console.log('Capturing session ID from capabilities:', deviceUDID);
    
    const api = new BrowserStackAPI();
    
    // Look for BrowserStack session ID in the capabilities or environment
    const browserstackSessionId = sessionCapabilities['bstack:options']?.sessionId ||
                                 process.env.BROWSERSTACK_SESSION_ID ||
                                 deviceUDID;
    
    if (browserstackSessionId) {
      api.captureCurrentSessionId(browserstackSessionId);
      console.log(`Session ID captured: ${browserstackSessionId}`);
    } else {
      console.log('No session ID found to capture');
    }
  } catch (error) {
    console.error('Error capturing session ID:', error);
  }
});

When('I collect app profiling data for the current session', async function() {
  try {
    const api = new BrowserStackAPI();
    const profilingData = await api.getCurrentSessionProfilingData();
    
    if (profilingData) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `manual-profiling-${timestamp}.json`;
      api.saveProfilingData(profilingData, filename);
      
      console.log(`Manual profiling data saved: ${filename}`);
      
      // Store in scenario context for verification
      this.profilingData = profilingData;
    } else {
      console.log('No profiling data available for current session');
    }
  } catch (error) {
    console.error('Error collecting profiling data:', error);
  }
});

Then('the app profiling data should show CPU usage below {int}%', function(maxCpuUsage) {
  if (!this.profilingData) {
    throw new Error('No profiling data available for verification');
  }
  
  const appData = this.profilingData.data['io.metamask.qa'];
  if (!appData || !appData.metrics || !appData.metrics.cpu) {
    throw new Error('CPU metrics not found in profiling data');
  }
  
  const avgCpu = appData.metrics.cpu.avg;
  console.log(`Average CPU usage: ${avgCpu}%`);
  
  if (avgCpu > maxCpuUsage) {
    throw new Error(`CPU usage ${avgCpu}% exceeds threshold of ${maxCpuUsage}%`);
  }
});

Then('the app profiling data should show memory usage below {int}MB', function(maxMemoryUsage) {
  if (!this.profilingData) {
    throw new Error('No profiling data available for verification');
  }
  
  const appData = this.profilingData.data['io.metamask.qa'];
  if (!appData || !appData.metrics || !appData.metrics.mem) {
    throw new Error('Memory metrics not found in profiling data');
  }
  
  const avgMemory = appData.metrics.mem.avg;
  console.log(`Average memory usage: ${avgMemory}MB`);
  
  if (avgMemory > maxMemoryUsage) {
    throw new Error(`Memory usage ${avgMemory}MB exceeds threshold of ${maxMemoryUsage}MB`);
  }
});

Then('the app profiling data should be available', function() {
  if (!this.profilingData) {
    throw new Error('No profiling data available');
  }
  
  console.log('Profiling data is available with the following metrics:');
  const appData = this.profilingData.data['io.metamask.qa'];
  if (appData && appData.metrics) {
    Object.keys(appData.metrics).forEach(metric => {
      console.log(`- ${metric}: ${JSON.stringify(appData.metrics[metric])}`);
    });
  }
}); 