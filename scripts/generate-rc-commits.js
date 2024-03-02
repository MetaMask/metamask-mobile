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
    'Howard Braham',
    'Kate Johnson',
    'Brian Bergeron',
  ],
  'Extension UX': ['David Walsh', 'vthomas13', 'Nidhi Kumari', 'Victor Thomas'],
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
    'Dan Miller',
    'Dan J Miller',
    'Gudahtt',
    'David Murdoch',
  ],
  DappAPI: ['tmashuang', 'jiexi', 'BelfordZ', 'Shane'],
  'Confirmation UX': [
    'Sylva Elendu',
    'Olusegun Akintayo',
    'Jyoti Puri',
    'Ariella Vu',
    'Sylva Elendu',
    'seaona',
  ],
  'Confirmation Systems': [
    'OGPoyraz',
    'vinistevam',
    'Matthew Walsh',
    'cryptotavares',
    'Vinicius Stevam',
    'Derek Brans',
  ],
  'Design Systems': ['georgewrmarshall', 'Garrett Bear', 'George Marshall', 'Brian August Nguyen'],
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
  Assets: ['salimtb', 'sahar-fehri', 'Brian Bergeron'],
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
  WalletPlatform: [
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
  ],
  WalletUX: [
    'Frank von Hoven',
  ],
  Swaps: ['Daniel', 'Davide Brocchetto'],
  Devex: ['Thomas Huang', 'Alex Donesky', 'jiexi', 'Zachary Belford'],
  Security: ['witmicko'],
  SDK: ['abretonc7s'],
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
      console.log('Match', prMatch)
      const prLink = prMatch
        ? `https://github.com/MetaMask/metamask-mobile/pull/${prMatch[1]}`
        : '';
      console.log('Match', prLink)

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
        escapeCSV(commit.hash),
        assignChangeType(commit.message),
        escapeCSV(commit.message),
        escapeCSV(commit.author),
        escapeCSV(team),
        commit.prLink
      ];
      csvContent.push(row.join(','));
    });
  }
  csvContent.unshift('Commit Hash,Change Type,Commit Message,Author,Team,PR Link');

  return csvContent;
}

// Helper function to escape CSV fields
function escapeCSV(field) {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`; // Encapsulate in double quotes and escape existing quotes
  }
  return field;
}
// Helper function to escape CSV fields
function assignChangeType(field) {
  if (field.includes('feat'))
    return 'Added';
  else if (field.includes('chore') || field.includes('test') || field.includes('ci')  || field.includes('docs'))
    return 'Changed';
  else if (field.includes('fix'))
    return 'Fixed';
  else
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
