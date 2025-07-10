// eslint-disable-next-line import/no-commonjs
require('dotenv').config({path: '.e2e.env'});
// eslint-disable-next-line import/no-nodejs-modules,import/no-commonjs
const {spawn} = require('child_process');

const platform = process.argv[2];

if (platform === 'android') {
  runCommand('./gradlew', [
    'connectedFlaskDebugAndroidTest',
    '-Pandroid.testInstrumentationRunnerArguments.package=com.metamask.ui',
  ], 'android');
} else if (platform === 'ios') {
  runCommand('npx', [
    'react-native',
    'bundle',
    '--platform',
    'ios',
    '--dev',
    'true',
    '--entry-file',
    'index.js',
    '--bundle-output',
    'ios/main.jsbundle'
  ]);
  runCommand('xcodebuild', [
    '-scheme', 'MetaMask',
    '-workspace', 'MetaMask.xcworkspace',
    '-configuration', 'Release',
    '-destination', 'platform=iOS Simulator,name=iPhone 16 Pro,OS=18.5',
    'test',
  ], 'ios');
} else {
  console.error(`Unsupported platform: ${platform}`);
  process.exit(1);
}

function runCommand(command, args, workingDir) {
  const options = {
    cwd: workingDir,
    stdio: 'inherit',
    env: { ...process.env },
  };

  const child = spawn(command, args, options);

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`${command} exited with code ${code}`);
      process.exit(code);
    }
  });
}
