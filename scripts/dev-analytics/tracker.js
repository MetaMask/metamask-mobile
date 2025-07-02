const { isAnalyticsEnabled, getConfig } = require('./config');

/**
 * Sends analytics data to Zapier webhook
 */
async function sendToZapier(data) {
  const config = getConfig();
  
  if (!config.zapierWebhookUrl) {
    console.debug('No Zapier webhook URL configured');
    return false;
  }

  return new Promise((resolve) => {
    const https = require('https');
    const url = require('url');
    
    try {
      const parsedUrl = new url.URL(config.zapierWebhookUrl);
      const postData = JSON.stringify(data);
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length,
          'User-Agent': 'MetaMask-Mobile-Dev-Analytics/1.0.0'
        },
        timeout: 5000
      };

      const req = https.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.debug('Analytics data sent successfully');
          resolve(true);
        } else {
          console.debug('Failed to send analytics data:', res.statusCode, res.statusMessage);
          resolve(false);
        }
      });

      req.on('error', (error) => {
        console.debug('Error sending analytics data:', error.message);
        resolve(false);
      });

      req.on('timeout', () => {
        console.debug('Analytics request timed out');
        req.destroy();
        resolve(false);
      });

      req.write(postData);
      req.end();
    } catch (error) {
      console.debug('Error preparing analytics request:', error.message);
      resolve(false);
    }
  });
}

/**
 * Tracks a command execution event
 */
async function trackCommand(command, args = []) {
  if (!isAnalyticsEnabled()) {
    return;
  }

  const config = getConfig();

  const eventData = {
    // Event metadata
    event: 'command_executed',
    timestamp: new Date().toISOString(),
    userId: config.userId,
    
    // Command information
    command,
    args,
    fullCommand: `${command} ${args.join(' ')}`.trim(),
    
    // Execution context
    environment: process.env.NODE_ENV || 'development',
    
    // Build context
    buildType: process.env.METAMASK_BUILD_TYPE || 'unknown',
    buildEnvironment: process.env.METAMASK_ENVIRONMENT || 'unknown',
    
    // Execution timing
    executionStart: new Date().toISOString()
  };

  // Send asynchronously without blocking the command
  sendToZapier(eventData).catch(error => {
    console.debug('Failed to send command analytics:', error.message);
  });
}

/**
 * Tracks a command completion event
 */
async function trackCommandCompletion(command, args = [], duration, exitCode, options = {}) {
  if (!isAnalyticsEnabled()) {
    return;
  }

  const config = getConfig();

  const eventData = {
    event: 'command_completed',
    timestamp: new Date().toISOString(),
    userId: config.userId,
    command,
    args,
    fullCommand: `${command} ${args.join(' ')}`.trim(),
    duration,
    exitCode,
    success: exitCode === 0,
    ...options
  };

  // Send asynchronously
  sendToZapier(eventData).catch(error => {
    console.debug('Failed to send command completion analytics:', error.message);
  });
}

/**
 * Tracks a generic event
 */
async function trackEvent(eventName, eventData = {}) {
  if (!isAnalyticsEnabled()) {
    return;
  }

  const config = getConfig();

  const fullEventData = {
    event: eventName,
    timestamp: new Date().toISOString(),
    userId: config.userId,
    ...eventData
  };

  // Send asynchronously
  sendToZapier(fullEventData).catch(error => {
    console.debug('Failed to send event analytics:', error.message);
  });
}

module.exports = {
  trackCommand,
  trackCommandCompletion,
  trackEvent,
  sendToZapier,
}; 