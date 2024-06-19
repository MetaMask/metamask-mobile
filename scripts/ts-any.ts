// import { ESLint } from 'eslint';
// import fs from 'fs';
import glob from 'glob';
import path from 'path';

// const eslint = new ESLint();

// // const dirPath = path.join(__dirname, '../app/util/url/sanitizeUrlInput.test.ts'); // Update this path

// async function checkFile(filePath: string) {
//   const results = await eslint.lintFiles([filePath]);
//   const source = fs.readFileSync(filePath, 'utf8');
//   const lines = source.split('\n');

//   for (const result of results) {
//     for (const message of result.messages) {
//       if (message.ruleId === '@typescript-eslint/no-explicit-any') {
//         console.log("file PAht", filePath)
//         // lines[message.line - 1] = `// eslint-disable-next-line @typescript-eslint/no-explicit-any\n${lines[message.line - 1]}`;
//       }
//     }
//   }

//   // fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
// }

// // Function to process all TypeScript and TypeScript React files in a directory and its subdirectories
// const processDirectory = (dirPath: string): void => {
//   const pattern = `${dirPath}/**/*.{ts,tsx}`;

//   glob(pattern, async(err, files) => {
//     if (err) {
//       console.error('Error finding TypeScript files:', err);
//       return;
//     }

//     for (let i=0; i<4; i++) {
//       const file = files[i];
//       console.log(file);
//       await checkFile(file).catch(console.error);
//     }
//   });
// };

// // // Example usage: Pass the directory path here

const dirPath = path.join(__dirname, '../app'); // Update this path

// processDirectory(dirPath);

import { ESLint } from 'eslint';
import fs from 'fs';

const eslint = new ESLint();

async function checkFile(filePath: string) {
  const fixedFileByLine: Record<string, number[]> = {};
  const results = await eslint.lintFiles([filePath]);
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split('\n');

  // console.log(filePath)

  for (const result of results) {
    for (const message of result.messages) {
      if (message.ruleId === '@typescript-eslint/no-explicit-any') {
        console.log('file PAht', filePath, message.line);
        if (fixedFileByLine[filePath]?.includes(message.line)) {
          console.log('DUIPE', filePath);
          continue;
        }
        fixedFileByLine[filePath] = [...(fixedFileByLine[filePath] || []), message.line];
        // console.log(lines[message.line])
        const lineWithAny = lines[message.line - 1];
      const indentation = (lineWithAny.match(/^\s*/)?.[0] || '');
      // console.log("indetn", indentation.length, lineWithAny)
        lines[message.line - 1] = `${indentation}// eslint-disable-next-line @typescript-eslint/no-explicit-any\n${lines[message.line - 1]}`;
      }
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

// Example usage
// checkFile(dirPath).catch(console.error);

const processDirectory = (dirPath: string): void => {
  const pattern = `${dirPath}/**/*.{ts,tsx}`;
  console.log(dirPath);

  glob(pattern, async(err, files) => {
    if (err) {
      console.error('Error finding TypeScript files:', err);
      return;
    }

    for (let i = 0; i < files.length - 1; i++) {
      const file = files[i];
      await checkFile(file).catch(console.error);
    }
  });
};

processDirectory(dirPath);
// checkFile('/Users/calleung/Desktop/metamask-mobile/app/util/testUtils/mocks/navigation.ts')
