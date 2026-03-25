/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'child_process';

/**
 * Returns the UDID of the first booted iOS simulator.
 * Throws if no simulator is booted.
 */
export function getBootedSimulatorUdid(): string {
  const output = execFileSync(
    'xcrun',
    ['simctl', 'list', 'devices', 'booted', '-j'],
    {
      encoding: 'utf-8',
    },
  );

  const data = JSON.parse(output) as {
    devices: Record<
      string,
      { udid: string; state: string; name: string }[]
    >;
  };

  for (const [, deviceList] of Object.entries(data.devices)) {
    for (const simulatorDevice of deviceList) {
      if (simulatorDevice.state === 'Booted') {
        return simulatorDevice.udid;
      }
    }
  }

  throw new Error(
    'No booted iOS simulator found. Start a simulator before running visual tests.',
  );
}
