#!/usr/bin/env node

/**
 * Database Reset Script
 * 
 * Interactive script to reset and manage the database.
 * Usage: npm run db:reset
 */

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function showBanner() {
  console.clear();
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║              🗄️  MyAmanah Database Manager                ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');
  log('');
}

function showMenu() {
  log('What would you like to do?', 'bright');
  log('');
  log('  1. 🚨 FULL RESET - Delete all data and re-apply migrations', 'red');
  log('  2. 🔄 Soft Reset - Keep schema, delete all table data only');
  log('  3. 📊 Show Database Status');
  log('  4. 🌱 Seed with Test Data');
  log('  5. 🧹 Clean up migration files (delete all)');
  log('  6. 🆕 Fresh Install - Reset + Seed with sample data');
  log('  7. ❌ Exit');
  log('');
}

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function promptConfirm(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

function exec(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: path.join(__dirname, '..'),
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getDbStatus() {
  log('\n📊 Checking database status...', 'blue');
  
  // Check if .env exists
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    log('⚠️  No .env file found!', 'yellow');
    return;
  }

  // Try to get migration status
  const result = exec('npx prisma migrate status', { silent: true });
  
  if (!result.success) {
    log('❌ Could not connect to database', 'red');
    log('   Make sure your DATABASE_URL in .env is correct', 'yellow');
    return;
  }

  log('\n📁 Migration Status:', 'bright');
  log(result.output || 'No pending migrations');

  // Try to count records in key tables
  log('\n📈 Record Counts:', 'bright');
  const tables = ['User', 'Vault', 'TrustedContactReleaseChannel', 'ReleaseAuditEvent'];
  
  for (const table of tables) {
    log(`  ${table}: (run 'npx prisma studio' to view)`);
  }
}

async function fullReset() {
  log('\n🚨 FULL DATABASE RESET', 'red');
  log('═══════════════════════════════════════════════════════════', 'red');
  log('This will:', 'yellow');
  log('  • Delete ALL data from the database');
  log('  • Delete ALL migration history');
  log('  • Re-apply all migrations from scratch');
  log('  • This action CANNOT be undone!\n', 'red');

  const confirmed = await promptConfirm(
    `${COLORS.red}Are you absolutely sure you want to continue?${COLORS.reset}`
  );

  if (!confirmed) {
    log('\n❌ Cancelled.', 'yellow');
    return;
  }

  // Double confirmation
  const dbUrl = process.env.DATABASE_URL || 'from .env';
  log(`\n⚠️  Target database: ${COLORS.yellow}${dbUrl}${COLORS.reset}`);
  const reallySure = await promptConfirm(
    `${COLORS.red}Type "yes" again to confirm deletion of ALL data${COLORS.reset}`
  );

  if (!reallySure) {
    log('\n❌ Cancelled.', 'yellow');
    return;
  }

  log('\n🔄 Executing full reset...\n', 'blue');

  // Step 1: Reset database
  log('1️⃣  Resetting database...', 'blue');
  const resetResult = exec('npx prisma migrate reset --force --skip-generate');
  if (!resetResult.success) {
    log('❌ Reset failed!', 'red');
    return;
  }

  // Step 2: Generate Prisma client
  log('\n2️⃣  Generating Prisma client...', 'blue');
  const genResult = exec('npx prisma generate');
  if (!genResult.success) {
    log('❌ Generation failed!', 'red');
    return;
  }

  log('\n✅ Full reset completed successfully!', 'green');
}

async function softReset() {
  log('\n🔄 SOFT RESET (Delete all data, keep schema)', 'yellow');
  log('═══════════════════════════════════════════════════════════', 'yellow');
  log('This will delete ALL records from ALL tables but keep the schema.', 'yellow');
  log('Useful for testing with a clean slate.\n');

  const confirmed = await promptConfirm('Continue with soft reset?');

  if (!confirmed) {
    log('\n❌ Cancelled.', 'yellow');
    return;
  }

  log('\n🔄 Truncating all tables...\n', 'blue');

  // Get all table names from schema
  const result = exec(
    `npx prisma db execute --stdin <<< "
DO \$\$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;
"`,
    { silent: false }
  );

  if (result.success) {
    log('\n✅ All data cleared!', 'green');
    log('Schema and migrations are preserved.', 'green');
  } else {
    log('\n❌ Failed to truncate tables.', 'red');
    log('Try running: npx prisma migrate reset --force', 'yellow');
  }
}

async function seedData() {
  log('\n🌱 SEED DATABASE', 'green');
  log('═══════════════════════════════════════════════════════════', 'green');

  const confirmed = await promptConfirm('Seed database with test data?');

  if (!confirmed) {
    log('\n❌ Cancelled.', 'yellow');
    return;
  }

  log('\n🌱 Seeding... (not implemented yet)', 'yellow');
  log('To add seed data, create prisma/seed.ts and run:', 'yellow');
  log('  npx prisma db seed', 'cyan');
}

async function cleanMigrations() {
  log('\n🧹 CLEAN MIGRATIONS', 'yellow');
  log('═══════════════════════════════════════════════════════════', 'yellow');
  log('This will delete ALL migration files from prisma/migrations/', 'red');
  log('Useful when you want to start fresh with a single migration.\n');

  const migrationsPath = path.join(__dirname, '..', 'prisma', 'migrations');
  
  if (!fs.existsSync(migrationsPath)) {
    log('No migrations folder found.', 'yellow');
    return;
  }

  const files = fs.readdirSync(migrationsPath).filter(f => f !== 'migration_lock.toml');
  
  log(`Found ${files.length} migration folders:`, 'blue');
  files.forEach(f => log(`  - ${f}`));
  log('');

  const confirmed = await promptConfirm(
    `${COLORS.red}Delete all these migration folders?${COLORS.reset}`
  );

  if (!confirmed) {
    log('\n❌ Cancelled.', 'yellow');
    return;
  }

  // Delete migration folders
  let deleted = 0;
  for (const file of files) {
    const filePath = path.join(migrationsPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
      deleted++;
    }
  }

  log(`\n✅ Deleted ${deleted} migration folders.`, 'green');
  log('\nNext steps:', 'bright');
  log('  1. Update your schema.prisma if needed');
  log('  2. Run: npx prisma migrate dev --name init');
  log('  3. This will create a fresh initial migration');
}

async function freshInstall() {
  log('\n🆕 FRESH INSTALL', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('This will:', 'yellow');
  log('  1. Reset the database (delete all data)');
  log('  2. Apply all migrations');
  log('  3. Seed with sample data\n');

  const confirmed = await promptConfirm('Continue with fresh install?');

  if (!confirmed) {
    log('\n❌ Cancelled.', 'yellow');
    return;
  }

  await fullReset();
  log('');
  await seedData();
}

async function main() {
  showBanner();

  // Check if in right directory
  if (!fs.existsSync(path.join(__dirname, '..', 'package.json'))) {
    log('❌ Error: Must run from project root', 'red');
    process.exit(1);
  }

  while (true) {
    showMenu();
    const choice = await prompt('Enter your choice (1-7): ');

    switch (choice) {
      case '1':
        await fullReset();
        break;
      case '2':
        await softReset();
        break;
      case '3':
        await getDbStatus();
        break;
      case '4':
        await seedData();
        break;
      case '5':
        await cleanMigrations();
        break;
      case '6':
        await freshInstall();
        break;
      case '7':
        log('\n👋 Goodbye!', 'green');
        rl.close();
        process.exit(0);
      default:
        log('\n❌ Invalid choice. Please enter 1-7.', 'red');
    }

    log('\n');
    await prompt('Press Enter to continue...');
    showBanner();
  }
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
