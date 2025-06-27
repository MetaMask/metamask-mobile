require('dotenv').config({path: '.e2e.env'});
const {exec} = require('child_process');
exec('cd android && ./gradlew connectedFlaskDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.package=com.metamask.ui', (error, stdout, stderr) => {
  if (error) {
    console.error(`Gradle Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Gradle stderr: ${stderr}`);
  }
  console.log(`Gradle output:\n${stdout}`);
});
