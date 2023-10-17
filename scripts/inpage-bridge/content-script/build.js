const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', '/', 'dist');

const inpageContent = fs
  .readFileSync(path.join(distPath, 'inpage-content.js'))
  .toString();

// wrap the inpage content in a variable declaration
const code = `const inpageBundle = ${JSON.stringify(inpageContent)}`;

fs.writeFileSync(path.join(distPath, 'inpage-bundle.js'), code, 'ascii');
console.log('content-script.js generated succesfully');
