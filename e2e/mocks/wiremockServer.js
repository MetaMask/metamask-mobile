import { spawn } from 'child_process';
import path from 'path';

// Define the path to the WireMock JAR file and the port to use
const wiremockPath = path.resolve(
  __dirname,
  'wiremock/wiremock-jre8-standalone-2.32.0.jar',
);
const wiremockPort = 8080;
const mappingsDir = path.resolve(__dirname, 'wiremock/mappings'); // Directory containing mapping files

let wiremockProcess;

// sstart the WireMock server
export const startWireMockServer = () => {
  console.log(`Starting WireMock server on port ${wiremockPort}...`);
  wiremockProcess = spawn('java', [
    '-jar',
    wiremockPath,
    '--port',
    wiremockPort,
    '--root-dir',
    mappingsDir,
  ]);
  wiremockProcess.stdout.on('data', (data) => {
    console.log(`WireMock server stream: ${data}`);
  });

  wiremockProcess.stderr.on('data', (data) => {
    console.error(`WireMock error: ${data}`);
  });

  wiremockProcess.on('close', (code) => {
    console.log(`WireMock command exited with code ${code}`);
  });
};

// Stop the WireMock server
export const stopWireMockServer = () => {
  if (wiremockProcess) {
    console.log('Stopping WireMock server...');
    wiremockProcess.kill('SIGINT'); // gracefully stop the process
    wiremockProcess = null;
    console.log('WireMock server stopped.');
  } else {
    console.log('WireMock server is not running.');
  }
};
