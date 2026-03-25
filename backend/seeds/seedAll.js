const { spawnSync } = require('node:child_process');
const path = require('node:path');

const run = (script) => {
  const full = path.join(__dirname, script);
  const result = spawnSync(process.execPath, [full], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

// Order matters: users -> events -> faculty data
run('seedUsers.js');
run('seedEvents.js');
run('seedFacultyData.js');

