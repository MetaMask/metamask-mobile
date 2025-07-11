// eslint-disable-next-line import/no-commonjs
require('dotenv').config({path: '.e2e.env'});
// eslint-disable-next-line import/no-nodejs-modules,import/no-commonjs
const {exec} = require('child_process');
exec('cd android && ./gradlew connectedFlaskDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.package=com.metamask.ui', (error, stdout, stderr) => {
  if (error) {
    console.error(`Gradle Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Gradle stderr: ${stderr}`);
  }
  // eslint-disable-next-line no-console
  console.log(`Gradle output:\n${stdout}`);
});
