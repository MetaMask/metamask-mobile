// avdUtils.js
const { execSync } = require('child_process');

function getAvailableAVDs() {
  try {
    // Run the command to list available AVDs
    const output = execSync('emulator -list-avds').toString();

    // Parse the output and return an array of AVD names
    return output.trim().split('\n');
  } catch (error) {
    console.error('Error retrieving AVD list:', error.message);
    return [];
  }
}

module.exports = { getAvailableAVDs };
