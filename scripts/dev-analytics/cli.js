#!/usr/bin/env node

const { optIn, optOut, getConfig, CONFIG_FILE } = require('./config');
const { trackEvent } = require('./tracker');

const HELP_TEXT = `
MetaMask Mobile Developer Analytics CLI

Usage:
  node scripts/dev-analytics/cli.js <command> [options]

Commands:
  opt-in <webhook-url>    Opt in to developer analytics with Zapier webhook URL
  opt-out                 Opt out of developer analytics
  status                  Show current analytics configuration
  test                    Send a test event to verify webhook setup
  help                    Show this help message

Examples:
  node scripts/dev-analytics/cli.js opt-in https://hooks.zapier.com/hooks/catch/12345/abc123/
  node scripts/dev-analytics/cli.js opt-out
  node scripts/dev-analytics/cli.js status
  node scripts/dev-analytics/cli.js test

Configuration file location: ${CONFIG_FILE}
`;

function showHelp() {
  console.log(HELP_TEXT);
}

function showStatus() {
  const config = getConfig();
  
  console.log('\n📊 MetaMask Mobile Developer Analytics Status\n');
  console.log('Configuration file:', CONFIG_FILE);
  console.log('Opted in:', config.optedIn ? '✅ Yes' : '❌ No');
  
  if (config.optedIn) {
    console.log('User ID:', config.userId || 'Not set');
    console.log('Webhook URL:', config.zapierWebhookUrl ? '✅ Configured' : '❌ Not configured');
    console.log('Created:', config.createdAt || 'Unknown');
    console.log('Last updated:', config.lastUpdated || 'Unknown');
  }
  
  console.log();
}

async function handleOptIn(webhookUrl) {
  if (!webhookUrl) {
    console.error('❌ Error: Zapier webhook URL is required');
    console.log('\nExample:');
    console.log('  node scripts/dev-analytics/cli.js opt-in https://hooks.zapier.com/hooks/catch/12345/abc123/');
    console.log('\nTo get a webhook URL:');
    console.log('  1. Go to https://zapier.com/');
    console.log('  2. Create a new Zap');
    console.log('  3. Use "Webhooks by Zapier" as the trigger');
    console.log('  4. Choose "Catch Hook" and copy the webhook URL');
    process.exit(1);
  }

  // Basic URL validation
  try {
    new URL(webhookUrl);
  } catch (error) {
    console.error('❌ Error: Invalid webhook URL provided');
    console.log('Please provide a valid HTTP/HTTPS URL');
    process.exit(1);
  }

  try {
    const success = optIn(webhookUrl);
    if (success) {
      console.log('✅ Successfully opted in to developer analytics!');
      console.log('📊 Analytics will now be sent to your Zapier webhook');
      
      // Send a test event to verify the setup
      console.log('\n🧪 Sending test event...');
      await trackEvent('developer_opted_in', {
        source: 'cli',
        webhookUrl: webhookUrl.replace(/\/[^/]*$/, '/***') // Hide the sensitive part
      });
      console.log('✅ Test event sent! Check your Zapier dashboard to verify receipt.');
      
      showStatus();
    } else {
      console.error('❌ Failed to save configuration');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function handleOptOut() {
  try {
    const success = optOut();
    if (success) {
      console.log('✅ Successfully opted out of developer analytics');
      console.log('📊 No more analytics data will be sent');
      showStatus();
    } else {
      console.error('❌ Failed to save configuration');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function handleTest() {
  const config = getConfig();
  
  if (!config.optedIn) {
    console.error('❌ Analytics not enabled. Please opt in first:');
    console.log('  node scripts/dev-analytics/cli.js opt-in <webhook-url>');
    process.exit(1);
  }

  if (!config.zapierWebhookUrl) {
    console.error('❌ No webhook URL configured. Please opt in again with a valid webhook URL.');
    process.exit(1);
  }

  console.log('🧪 Sending test event to webhook...');
  console.log('Webhook URL:', config.zapierWebhookUrl.replace(/\/[^/]*$/, '/***'));
  
  try {
    await trackEvent('test_event', {
      source: 'cli_test',
      message: 'This is a test event from MetaMask Mobile developer analytics',
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Test event sent successfully!');
    console.log('Check your Zapier dashboard to verify the event was received.');
  } catch (error) {
    console.error('❌ Failed to send test event:', error.message);
    process.exit(1);
  }
}

// Main CLI handler
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'opt-in':
      handleOptIn(args[1]);
      break;
    
    case 'opt-out':
      handleOptOut();
      break;
    
    case 'status':
      showStatus();
      break;
    
    case 'test':
      handleTest();
      break;
    
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    
    default:
      console.error('❌ Unknown command:', command || 'none');
      showHelp();
      process.exit(1);
  }
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  showHelp,
  showStatus,
  handleOptIn,
  handleOptOut,
  handleTest
}; 