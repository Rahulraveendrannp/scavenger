# Database Cleanup Scripts

## cleanupDuplicates.js

This script cleans up duplicate UserProgress entries in the database.

### What it does:
- Finds all UserProgress documents
- Groups them by phone number
- Identifies phone numbers with multiple entries
- Merges all data from duplicate entries into the oldest one
- Deletes the duplicate entries

### What gets merged:
- **Completed checkpoints**: All unique checkpoint completions
- **Revealed hints**: All unique hint reveals
- **Hint credits**: Keeps the higher credit count
- **Dashboard games**: Keeps completed game states
- **Game stats**: Sums up all statistics (scans, hints used, time spent, login count)
- **Timestamps**: Keeps the most recent login and activity times

### How to run:
```bash
cd server/scripts
node cleanupDuplicates.js
```

### Safety:
- The script keeps the oldest document and merges data from newer ones
- It only deletes documents after successfully merging all data
- It logs all operations for transparency
- It's safe to run multiple times

### When to use:
- If you notice multiple UserProgress entries for the same user
- After fixing the race condition in the code
- As a one-time cleanup measure
