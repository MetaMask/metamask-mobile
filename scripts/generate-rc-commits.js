const fs = require('fs');
const simpleGit = require('simple-git');
/*
 * This script is used to filter and group commits by teams based on unique commit messages.
 * It takes two branches as input and generates a CSV file with the commit hash, commit message, author, team, and PR link.
 * The teams and their members are defined in the 'authorTeams' object.
 *
 * Command to run the script: node development/generate-rc-commits.js origin/branchA origin/branchB
 * Output: the generated commits will be in a file named 'commits.csv'.
 */

// JSON mapping authors to teams
const authorTeams = {
  Accounts: [
    'Owen Craston',
    'Gustavo Antunes',
    'Monte Lai',
    'Daniel Rocha',
    'Kate Johnson',
    'Charly Chevalier',
  ],
  Assets: ['salimtb', 'sahar-fehri', 'Brian Bergeron'],
  'Confirmation Systems': [
    'OGPoyraz',
    'vinistevam',
    'Matthew Walsh',
    'cryptotavares',
    'Vinicius Stevam',
    'Derek Brans',
    'sleepytanya',
  ],
  DappAPI: ['tmashuang', 'jiexi', 'BelfordZ', 'Shane','Thomas Huang', 'Alex Donesky', 'jiexi', 'Zachary Belford'],
  'Confirmation UX': [
    'Sylva Elendu',
    'Olusegun Akintayo',
    'Jyoti Puri',
    'Ariella Vu',
    'Sylva Elendu',
    'seaona',
  ],
  'Design Systems': ['georgewrmarshall', 'Garrett Bear', 'George Marshall', 'Brian August Nguyen'],
  'Extension Platform': [
    'chloeYue',
    'Pedro Figueiredo',
    'danjm',
    'Danica Shen',
    'Brad Decker',
    'Mark Stacey',
    'hjetpoluru',
    'Harika Jetpoluru',
    'Marina Boboc',
    'Gauthier Petetin',
    'Howard Braham',
    'Dan Miller',
    'Dan J Miller',
    'Gudahtt',
    'David Murdoch',
  ],
  'Hardware Wallets': ['Xiaoming Wang'],
  Linea: ['VGau'],
  Lavamoat: ['weizman', 'legobeat', 'kumavis',  'LeoTM'],
  'Shared Libraries': ['Michele Esposito', 'Elliot Winkler'],
  MMI: [
    'António Regadas',
    'Albert Olivé',
    'Ramon AC',
    'Shane T',
    'Bernardo Garces Chapero',
  ],
  'Mobile Platform': [
    'cortisiko',
    'Cal-L',
    'chrisleewilcox',
    'NicolasMassart',
    'Andepande',
    'tommasini',
    'MarioAslau',
    'sethkfman',
    'jpcloureiro',
    'kylanhurt',
    'SamuelSalas',
    'Nico MASSART',
    'Cal Leung',
    'Curtis David',
    'yande',
    'Aslau Mario-Daniel',
    'Kylan Hurt',
    'CW',
  ],
  Ramps: ['Pedro Pablo Aste Kompen'],
  Security: ['witmicko', 'Nicholas Ellul'],
  SDK: ['abretonc7s', 'Omri Dan'],
  Snaps: [
    'David Drazic',
    'hmalik88',
    'Montoya',
    'Mrtenz',
    'Frederik Bolding',
    'Bowen Sanders',
    'Guillaume Roux',
    'Hassan Malik',
    'Maarten Zuidhoorn',
    'Jonathan Ferreira',
  ],
  Swaps: ['Daniel', 'Davide Brocchetto'],
  'Wallet UX': ['David Walsh', 'vthomas13', 'Nidhi Kumari', 'Victor Thomas'],
};

// Function to get the team for a given author
function getTeamForAuthor(authorName) {
  for (const [team, authors] of Object.entries(authorTeams)) {
    if (authors.includes(authorName)) {
      return team;
    }
  }
  return 'Other/Unknown'; // Default team for unknown authors
}

// Function to filter commits based on unique commit messages and group by teams
async function filterCommitsByTeam(branchA, branchB) {
  try {
    const git = simpleGit();

    const logOptions = {
      from: branchB,
      to: branchA,
      format: {
        hash: '%H',
        author: '%an',
        message: '%s',
      },
    };

    const log = await git.log(logOptions);
    const seenMessages = new Set();
    const seenMessagesArray = [];
    const commitsByTeam = {};

    const MAX_COMMITS = 500; // Limit the number of commits to process

    for (const commit of log.all) {
      const { author, message, hash } = commit;
      if (commitsByTeam.length >= MAX_COMMITS) {
        break;
      }

      const team = getTeamForAuthor(author);

      // Extract PR number from the commit message using regex
      const prMatch = message.match(/\(#(\d{4})\)$/u);
      const prLink = prMatch ? `https://github.com/MetaMask/metamask-mobile/pull/${prMatch[1]}` : '';

      // Check if the commit message is unique
      if (!seenMessages.has(message)) {
        seenMessagesArray.push(message);
        seenMessages.add(message);

        // Initialize the team's commits array if it doesn't exist
        if (!commitsByTeam[team]) {
          commitsByTeam[team] = [];
        }

        commitsByTeam[team].push({
          message,
          author,
          hash: hash.substring(0, 10),
          prLink,
        });
      }
    }

    return commitsByTeam;
  } catch (error) {
    console.error(error);
    return {};
  }
}

function formatAsCSV(commitsByTeam) {
  const csvContent = [];
  for (const [team, commits] of Object.entries(commitsByTeam)) {
    commits.forEach((commit) => {
      const row = [
        escapeCSV(commit.message),
        escapeCSV(commit.author),
        commit.prLink,
        escapeCSV(team),
        assignChangeType(commit.message)
      ];
      csvContent.push(row.join(','));
    });
  }
  csvContent.unshift('Commit Message,Author,PR Link,Team,Change Type');

  return csvContent;
}

// Helper function to escape CSV fields
function escapeCSV(field) {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`; // Encapsulate in double quotes and escape existing quotes
  }
  return field;
}
// Helper function to create change type
function assignChangeType(field) {
  if (field.includes('feat'))
    return 'Added';
  else if (field.includes('cherry') || field.includes('bump'))
    return 'Ops';
  else if (field.includes('chore') || field.includes('test') || field.includes('ci')  || field.includes('docs') || field.includes('refactor'))
    return 'Changed';
  else if (field.includes('fix'))
    return 'Fixed';

  return 'Unknown';
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error('Usage: node script.js branchA branchB');
    process.exit(1);
  }

  const branchA = args[0];
  const branchB = args[1];

  const commitsByTeam = await filterCommitsByTeam(branchA, branchB);

  if (Object.keys(commitsByTeam).length === 0) {
    console.log('No unique commits found.');
  } else {
    const csvContent = formatAsCSV(commitsByTeam);
    fs.writeFileSync('commits.csv', csvContent.join('\n'));
    console.log('CSV file "commits.csv" created successfully.');
  }
}

main();
