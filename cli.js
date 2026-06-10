#!/usr/bin/env node

'use strict';

const path = require('path');
const { generateProject, TEMPLATES } = require('./src/cli/init');

function printHelp() {
  console.log(`
express-starter-kit init <projectName> [options]

Generate a new Express project

Options:
  --template <type>   Template to use (basic | auth | websocket | full)  [default: basic]
  --db <dialect>      Database dialect (postgres | mysql | sqlite)        [default: postgres]
  --redis             Include Redis support                               [default: false]
  --force             Overwrite existing directory                        [default: false]
  --help              Show this help message

Examples:
  express-starter-kit init my-app
  express-starter-kit init my-app --template auth --db mysql
  express-starter-kit init my-app --template full --redis
  express-starter-kit init my-app --force
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const subcommand = args[0];
  if (subcommand !== 'init') {
    console.error(`Unknown command: ${subcommand}`);
    printHelp();
    process.exit(1);
  }

  const projectName = args[1];
  if (!projectName) {
    console.error('Error: project name is required');
    printHelp();
    process.exit(1);
  }

  const options = {
    template: 'basic',
    db: 'postgres',
    redis: false,
    force: false,
  };

  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--template':
        options.template = args[++i] || 'basic';
        break;
      case '--db':
        options.db = args[++i] || 'postgres';
        break;
      case '--redis':
        options.redis = true;
        break;
      case '--force':
        options.force = true;
        break;
    }
  }

  if (!TEMPLATES[options.template]) {
    console.error(`Error: Unknown template "${options.template}". Available: ${Object.keys(TEMPLATES).join(', ')}`);
    process.exit(1);
  }

  if (!['postgres', 'mysql', 'sqlite'].includes(options.db)) {
    console.error('Error: --db must be one of: postgres, mysql, sqlite');
    process.exit(1);
  }

  try {
    const targetDir = generateProject(projectName, options);
    console.log(`\n✓ Project "${projectName}" created at ${targetDir}`);
    console.log(`  Template: ${options.template}`);
    console.log(`  Database: ${options.db}`);
    console.log(`  Redis: ${options.redis ? 'yes' : 'no'}`);
    console.log('\nNext steps:');
    console.log(`  cd ${projectName}`);
    console.log('  npm install');
    console.log('  cp .env.example .env');
    console.log('  npm run dev\n');
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
