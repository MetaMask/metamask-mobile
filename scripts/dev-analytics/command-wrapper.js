#!/usr/bin/env node

const { spawn } = require('child_process');
const { trackCommand, trackCommandCompletion } = require('./tracker');
const { isAnalyticsEnabled } = require('./config');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Parses command line arguments to extract the actual command to run
 */
function parseArguments() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ No command provided to wrapper');
    process.exit(1);
  }

  // The first argument is the command, the rest are arguments to that command
  const command = args[0];
  const commandArgs = args.slice(1);
  
  return { command, commandArgs };
}

/**
 * Gets the original command that the developer typed
 */
function getOriginalCommand() {
  // Check if this was run via npm/yarn script
  const npmCommand = process.env.npm_command;
  const npmScript = process.env.npm_lifecycle_event;
  
  if (npmScript && (npmCommand === 'run-script' || npmCommand === 'run')) {
    // This was run via npm/yarn run
    const packageManager = process.env.npm_execpath?.includes('yarn') ? 'yarn' : 'npm';
    return {
      command: packageManager,
      args: [npmScript],
      fullCommand: `${packageManager} ${npmScript}`
    };
  }
  
  // Fallback to the wrapped command
  return null;
}

/**
 * Gets the tracking lock file path for an npm script
 */
function getTrackingLockFile(npmScript) {
  const tempDir = os.tmpdir();
  // Use npm script name and parent process ID to track across shell command chains
  const parentPid = process.env.npm_config_ppid || process.ppid || process.pid;
  return path.join(tempDir, `.metamask-analytics-${npmScript}-${parentPid}.lock`);
}

/**
 * Checks if a script is currently being tracked
 */
function isScriptBeingTracked(npmScript) {
  if (!npmScript) return false;
  
  const lockFile = getTrackingLockFile(npmScript);
  try {
    return fs.existsSync(lockFile);
  } catch {
    return false;
  }
}

/**
 * Creates a tracking lock for an npm script
 */
function createTrackingLock(npmScript) {
  if (!npmScript) return;
  
  const lockFile = getTrackingLockFile(npmScript);
  try {
    fs.writeFileSync(lockFile, process.pid.toString());
  } catch {
    // Ignore errors
  }
}

/**
 * Removes a tracking lock for an npm script
 */
function removeTrackingLock(npmScript) {
  if (!npmScript) return;
  
  const lockFile = getTrackingLockFile(npmScript);
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Checks if we should track this command execution
 */
function shouldTrackCommand() {
  // Don't track if analytics are disabled
  if (!isAnalyticsEnabled()) {
    return false;
  }
  
  // Don't track if we're already in a tracking context
  if (process.env.DEV_ANALYTICS_TRACKING) {
    return false;
  }
  
  // Don't track if this npm script is already being tracked
  const npmScript = process.env.npm_lifecycle_event;
  if (npmScript && isScriptBeingTracked(npmScript)) {
    return false;
  }
  
  return true;
}

/**
 * Executes a command and tracks its execution
 */
async function executeCommand(command, commandArgs) {
  const startTime = Date.now();
  const fullCommand = `${command} ${commandArgs.join(' ')}`.trim();
  
  console.log(`🚀 Executing: ${fullCommand}`);
  
  // Check if we should track this execution
  const shouldTrack = shouldTrackCommand();
  
  // Track command start (non-blocking)
  if (shouldTrack) {
    // Create tracking lock to prevent other parts of this script from being tracked
    const npmScript = process.env.npm_lifecycle_event;
    if (npmScript) {
      createTrackingLock(npmScript);
    }
    
    const originalCommand = getOriginalCommand();
    if (originalCommand) {
      // Track the original yarn/npm command the developer typed
      trackCommand(originalCommand.command, originalCommand.args, {
        wrappedExecution: true,
        originalCommand: originalCommand.fullCommand,
        actualCommand: fullCommand,
        parentProcess: process.title
      }).catch(() => {
        // Silently ignore analytics errors
      });
    } else {
      // Fallback to tracking the wrapped command
      trackCommand(command, commandArgs, {
        wrappedExecution: true,
        parentProcess: process.title,
        commandLine: process.argv.join(' ')
      }).catch(() => {
        // Silently ignore analytics errors
      });
    }
  }

  return new Promise((resolve) => {
    // Set environment variables to prevent nested tracking
    const childEnv = {
      ...process.env,
      DEV_ANALYTICS_TRACKING: 'true'
    };
    
    // Get the original command and npm script info for tracking
    const originalCommand = shouldTrack ? getOriginalCommand() : null;
    const npmScript = process.env.npm_lifecycle_event;
    
    // Cleanup function to remove tracking lock
    const cleanup = () => {
      if (shouldTrack && npmScript) {
        removeTrackingLock(npmScript);
      }
    };
    
    const childProcess = spawn(command, commandArgs, {
      stdio: 'inherit', // Pass through stdin, stdout, stderr
      shell: true,      // Use shell to resolve command
      env: childEnv     // Pass through environment variables with tracking flag
    });

    childProcess.on('close', (exitCode) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`\n⏱️  Command completed in ${duration}ms with exit code ${exitCode}`);
      
      // Clean up tracking lock
      cleanup();
      
      // Track command completion (non-blocking)
      if (shouldTrack) {
        if (originalCommand) {
          // Track completion of the original yarn/npm command
          trackCommandCompletion(originalCommand.command, originalCommand.args, duration, exitCode, {
            wrappedExecution: true,
            originalCommand: originalCommand.fullCommand,
            actualCommand: fullCommand,
            parentProcess: process.title
          }).catch(() => {
            // Silently ignore analytics errors
          });
        } else {
          // Fallback to tracking the wrapped command
          trackCommandCompletion(command, commandArgs, duration, exitCode, {
            wrappedExecution: true,
            parentProcess: process.title
          }).catch(() => {
            // Silently ignore analytics errors
          });
        }
      }
      
      resolve(exitCode);
    });

    childProcess.on('error', (error) => {
      console.error(`❌ Failed to execute command: ${error.message}`);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Clean up tracking lock
      cleanup();
      
      // Track command failure (non-blocking)
      if (shouldTrack) {
        if (originalCommand) {
          // Track failure of the original yarn/npm command
          trackCommandCompletion(originalCommand.command, originalCommand.args, duration, 1, {
            wrappedExecution: true,
            originalCommand: originalCommand.fullCommand,
            actualCommand: fullCommand,
            error: error.message,
            parentProcess: process.title
          }).catch(() => {
            // Silently ignore analytics errors
          });
        } else {
          // Fallback to tracking the wrapped command
          trackCommandCompletion(command, commandArgs, duration, 1, {
            wrappedExecution: true,
            error: error.message,
            parentProcess: process.title
          }).catch(() => {
            // Silently ignore analytics errors
          });
        }
      }
      
      resolve(1);
    });

    // Handle process termination signals
    process.on('SIGINT', () => {
      console.log('\n⚠️  Received SIGINT, terminating child process...');
      cleanup();
      childProcess.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      console.log('\n⚠️  Received SIGTERM, terminating child process...');
      cleanup();
      childProcess.kill('SIGTERM');
    });
  });
}

/**
 * Main function
 */
async function main() {
  try {
    const { command, commandArgs } = parseArguments();
    const exitCode = await executeCommand(command, commandArgs);
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Wrapper error:', error.message);
    process.exit(1);
  }
}

// Show analytics status on first run (only if analytics are configured)
function showAnalyticsInfo() {
  if (isAnalyticsEnabled()) {
    console.log('📊 Developer analytics enabled - command usage will be tracked');
  }
}

// Run main function if this file is executed directly
if (require.main === module) {
  showAnalyticsInfo();
  main();
}

module.exports = {
  parseArguments,
  executeCommand,
  getOriginalCommand,
  shouldTrackCommand,
  isScriptBeingTracked,
  createTrackingLock,
  removeTrackingLock,
  main
}; 