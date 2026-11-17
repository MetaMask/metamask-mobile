/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import path from 'path';

import Routes from '../../app/constants/navigation/Routes';
import {
  flattenRouteDefinitions,
  getRouteCoverage,
  ROUTE_PAGE_OBJECT_REGISTRY,
  type RouteCoverageReport,
} from '../page-objects/route-registry';

function printReport(report: RouteCoverageReport, onlyUncovered: boolean): void {
  const { summary } = report;
  const routes = onlyUncovered
    ? report.routes.filter((entry) => entry.status === 'no-page-object')
    : report.routes;

  console.log('='.repeat(80));
  console.log('  ROUTE PAGE OBJECT COVERAGE REPORT');
  console.log('='.repeat(80));
  console.log(`  Generated: ${report.generatedAt}`);
  console.log('');
  console.log('  SUMMARY');
  console.log(`  ${'-'.repeat(40)}`);
  console.log(`  ${'Total routes:'.padEnd(25)}${summary.totalRoutes}`);
  console.log(`  ${'With a page object:'.padEnd(25)}${summary.withPageObject}`);
  console.log(
    `  ${'No page object yet:'.padEnd(25)}${summary.withoutPageObject}`,
  );
  console.log(`  ${'Not a screen:'.padEnd(25)}${summary.notAScreen}`);
  console.log(
    `  ${'Not in the registry:'.padEnd(25)}${summary.unregistered}`,
  );
  console.log(`  ${'Stale registry entries:'.padEnd(25)}${summary.staleEntries}`);
  console.log(
    `  ${'Coverage:'.padEnd(25)}${summary.coveragePercentage}% of screen routes have a page object`,
  );
  console.log('');

  const routeColumn = 48;
  const statusColumn = 16;
  const header = [
    'Route'.padEnd(routeColumn),
    'Status'.padEnd(statusColumn),
    'Page object',
  ].join(' | ');
  console.log(`  ${header}`);
  console.log(`  ${'-'.repeat(header.length)}`);

  for (const entry of routes) {
    console.log(
      `  ${[
        entry.route.padEnd(routeColumn),
        entry.status.toUpperCase().padEnd(statusColumn),
        entry.pageObject ?? '-',
      ].join(' | ')}`,
    );
  }

  if (report.staleEntries.length > 0) {
    console.log('');
    console.log('  STALE REGISTRY ENTRIES');
    for (const route of report.staleEntries) {
      console.log(`  - ${route}`);
    }
  }

  if (report.aliasedRoutes.length > 0) {
    console.log('');
    console.log('  ALIASED ROUTE VALUES');
    for (const route of report.aliasedRoutes) {
      const entry = report.routes.find((candidate) => candidate.route === route);
      console.log(`  - ${route}: ${entry?.keyPaths.join(', ')}`);
    }
  }

  console.log('='.repeat(80));
}

export function generateReport(): RouteCoverageReport {
  return getRouteCoverage(
    flattenRouteDefinitions(Routes),
    ROUTE_PAGE_OBJECT_REGISTRY,
  );
}

function main(): void {
  const report = generateReport();
  const onlyUncovered = process.argv.includes('--no-page-object-only');
  printReport(report, onlyUncovered);

  const outputPath = path.join(
    process.cwd(),
    'tests',
    'test-results',
    'route-coverage-report.json',
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(`${outputPath}`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`JSON report written to: ${outputPath}`);
}

if (require.main === module) {
  main();
}
