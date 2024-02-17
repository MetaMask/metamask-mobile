import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

// Pattern to match JavaScript and TypeScript files
// Pattern to match import statements from 'enzyme'

interface FileInfo {
  name: string;
  lineCount: number;
  absoluteFilePath: string;
  relativeFilePath: string;
  // Enzyme specific
  isSnapshotOnly: boolean;
  hasMockedStore: boolean;
}

// type FileInfoByName = { [fileName: string]: FileInfo };

let fileResultList: FileInfo[] = [];

// Inputs
const importPattern = /from 'enzyme'/;
const targetImpact = 25 / 100;
const targetImpactPercentage = `${targetImpact * 100}%`;

const main = async () => {
  const appDirectory = path.resolve(__dirname, '../');
  const filePattern: string = `${appDirectory}/app/**/*.{js,jsx,ts,tsx}`;
  const files = await glob(filePattern);
  let totalFileCount = 0;

  // Enzyme specific
  const itPattern = /it\(.*?\)/g;
  const toMatchSnapshotPattern = /toMatchSnapshot\(\)/;
  const mockStorePattern = /mockStore/i; // case-insensitive
  let fileCountWithOnlySnapshot = 0;
  let fileCountWithOnlySnapshotAndStore = 0;

  files.forEach((file) => {
    // Read file
    const content: string = fs.readFileSync(file, 'utf8');

    // Check for matches
    const itPatternMatchesOnce = (content.match(itPattern) || []).length === 1;
    const hasSnapshotPatternMatch = toMatchSnapshotPattern.test(content);
    const hasEnzymePatternMatch = importPattern.test(content);
    const hasMockStorePatternMatch = mockStorePattern.test(content);
    const isSnapshotOnly = itPatternMatchesOnce && hasSnapshotPatternMatch;

    // Gather metadata
    const absoluteFilePath = path.resolve(appDirectory, file);
    const relativeFilePath = path.relative(appDirectory, absoluteFilePath);
    const lineCount = content.split('\n').length;

    if (
      hasEnzymePatternMatch
      // && isSnapshotOnly
      // && hasMockStorePatternMatch
    ) {
      fileResultList.push({
        name: file,
        lineCount,
        absoluteFilePath,
        relativeFilePath,
        // Enzyme specific
        isSnapshotOnly,
        hasMockedStore: hasMockStorePatternMatch,
      });
      if (isSnapshotOnly) {
        fileCountWithOnlySnapshot++;
        if (hasMockStorePatternMatch) {
          fileCountWithOnlySnapshotAndStore++;
        }
      }
    }
  });

  // Create summary
  totalFileCount = fileResultList.length;
  const fileCountForImpact = Math.ceil(targetImpact * totalFileCount);
  const snapshotTestFiles = fileResultList.filter(
    ({ isSnapshotOnly, hasMockedStore }) => isSnapshotOnly,
  );
  const topImpactFiles = snapshotTestFiles
    .sort((a, b) => a.lineCount - b.lineCount)
    .slice(0, fileCountForImpact);

  // Output results
  console.log(`Found enzyme usage in ${totalFileCount} files.`);
  console.log(`File count with only snapshot: ${fileCountWithOnlySnapshot}.`);
  console.log(
    `File count with only snapshot and mock store: ${fileCountWithOnlySnapshotAndStore}.`,
  );
  console.log(
    `Files needed to update to make ${targetImpactPercentage} impact: ${fileCountForImpact}.`,
  );
  console.log(topImpactFiles.length);
};

main();

// glob.glob(filePattern, (err, files) => {
//     console.log("HEY");
//   if (err) {
//     console.error('Error searching for files:', err);
//     return;
//   }
//   console.log("HEY")

//   files.forEach((file, index) => {
//     console.log("FILES!")
//     const content: string = fs.readFileSync(file, 'utf8');
//     if (importPattern.test(content)) {
//       count++;
//       console.log(`Found in: ${file}`);
//     }
//   });

//   console.log(`Number of files importing from 'enzyme': ${count}`);
// });
