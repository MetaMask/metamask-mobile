/* eslint-disable import-x/no-nodejs-modules */
import { collectDoctorReport, formatDoctorReport } from './ios/doctor';

const report = collectDoctorReport();
process.stdout.write(`${formatDoctorReport(report)}\n`);
process.exit(report.ok ? 0 : 1);
