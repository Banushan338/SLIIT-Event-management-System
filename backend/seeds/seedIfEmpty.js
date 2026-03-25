const { spawn } = require('child_process');
const { User } = require('../models/user.model');
const { Event } = require('../models/event.model');
const { logger } = require('../utils/logger');

const runSeedAll = () =>
  new Promise((resolve, reject) => {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCmd, ['run', 'seed:all'], {
      cwd: __dirname + '/..',
      stdio: 'inherit',
      shell: false,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`seed:all failed with exit code ${code}`));
    });
  });

async function seedIfEmpty() {
  const [userCount, eventCount] = await Promise.all([
    User.countDocuments({}),
    Event.countDocuments({}),
  ]);

  // If any core data is missing, run the canonical seeding scripts.
  if (userCount === 0 || eventCount === 0) {
    logger.info('Database empty/partial; running seed:all', {
      userCount,
      eventCount,
    });
    await runSeedAll();
    return { seeded: true };
  }

  return { seeded: false };
}

module.exports = { seedIfEmpty };

