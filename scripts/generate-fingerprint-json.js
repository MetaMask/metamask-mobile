const { createFingerprintAsync } = require('@expo/fingerprint');

async function generateFingerprintJson() {
  try {
    const result = await createFingerprintAsync(process.cwd());
    // Print full fingerprint object as pretty JSON to stdout.
    process.stdout.write(JSON.stringify(result, null, 2));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error generating fingerprint JSON: ${error.message}`);
    process.exit(1);
  }
}

generateFingerprintJson();


