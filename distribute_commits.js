import { execSync } from 'child_process';

// Configuration
const START_DATE = new Date('2026-07-01T12:00:00');
const END_DATE = new Date('2026-10-01T12:00:00');

// How many commits max per day?
const MAX_COMMITS_PER_DAY = 3; 

// Chance to skip a day completely (0.0 to 1.0)
const SKIP_DAY_CHANCE = 0.5;

console.log('Generating distributed commits...');

let currentDate = new Date(START_DATE);

while (currentDate <= END_DATE) {
  // Randomly decide whether to skip this day
  if (Math.random() > SKIP_DAY_CHANCE) {
    // Random number of commits for this day (1 to MAX_COMMITS_PER_DAY)
    const commitsToday = Math.floor(Math.random() * MAX_COMMITS_PER_DAY) + 1;

    for (let i = 0; i < commitsToday; i++) {
      // Add some random hours/minutes so they don't all look like exactly 12:00
      const randomHours = Math.floor(Math.random() * 8); // 0-8 hours variation
      const randomMinutes = Math.floor(Math.random() * 60);
      
      const commitDate = new Date(currentDate);
      commitDate.setHours(commitDate.getHours() + randomHours);
      commitDate.setMinutes(commitDate.getMinutes() + randomMinutes);

      // Format date for git: YYYY-MM-DDTHH:MM:SS
      const dateString = commitDate.toISOString();

      try {
        // Create an empty commit in the past
        execSync(`git commit --allow-empty --date="${dateString}" -m "Minor update and optimization"`, {
          stdio: 'ignore' // Hides the output to keep console clean
        });
        console.log(`Created commit for ${dateString}`);
      } catch (err) {
        console.error('Failed to create commit:', err.message);
      }
    }
  }

  // Move to next day
  currentDate.setDate(currentDate.getDate() + 1);
}

console.log('Done! You can now run "git push" to update your contribution graph.');
