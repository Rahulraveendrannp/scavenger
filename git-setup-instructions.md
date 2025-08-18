# Git Setup Instructions for talabat Scavenger Hunt

## Step 1: Remove node_modules from Git Tracking (if already added)

If `node_modules` directories are already being tracked by git, remove them:

```bash
# Remove node_modules from git tracking (but keep the files locally)
git rm -r --cached client/node_modules/
git rm -r --cached server/node_modules/
git rm -r --cached node_modules/ 2>/dev/null || true

# Remove any other build/cache directories
git rm -r --cached client/dist/ 2>/dev/null || true
git rm -r --cached server/dist/ 2>/dev/null || true
git rm -r --cached client/build/ 2>/dev/null || true
git rm -r --cached server/build/ 2>/dev/null || true
```

## Step 2: Check Git Status

```bash
git status
```

## Step 3: Add Your Files (excluding node_modules thanks to .gitignore)

```bash
# Add all files except those in .gitignore
git add .

# Check what's being added
git status
```

## Step 4: Commit Your Changes

```bash
git commit -m "Initial commit: talabat Scavenger Hunt Game

- Added responsive React frontend with authentication
- Added Node.js backend server
- Implemented QR code scanning system
- Added user progress tracking and persistence
- Mobile-optimized scavenger hunt game"
```

## Step 5: Connect to GitHub Repository

```bash
# Add the remote repository (if not already added)
git remote add origin https://github.com/Rahulraveendrannp/scavenger.git

# Check if remote is added correctly
git remote -v
```

## Step 6: Push to GitHub

```bash
# Push to the main branch
git push -u origin main

# If the above fails, try pushing to master branch
git push -u origin master
```

## Alternative: If Repository Already Has Content

If your GitHub repository already has some content, you might need to pull first:

```bash
# Pull any existing content first
git pull origin main --allow-unrelated-histories

# Then push your changes
git push origin main
```

## Verify Everything is Excluded

After pushing, verify that `node_modules` is not in your repository by checking:
- https://github.com/Rahulraveendrannp/scavenger

You should see:
- ✅ client/ folder (with source code, no node_modules)
- ✅ server/ folder (with source code, no node_modules) 
- ✅ .gitignore files
- ✅ README and documentation files
- ❌ NO node_modules directories

## Project Structure on GitHub

Your repository should look like this:
```
scavenger/
├── .gitignore
├── README.md
├── client/
│   ├── .gitignore
│   ├── package.json
│   ├── src/
│   └── public/
├── server/
│   ├── .gitignore
│   ├── package.json
│   ├── server.js
│   ├── routes/
│   ├── models/
│   └── controllers/
└── MIGRATION_GUIDE.md
```

## Troubleshooting

### If git push fails with authentication error:
```bash
# Use GitHub CLI to authenticate
gh auth login

# Or use personal access token instead of password
```

### If you get "repository not found" error:
Make sure the repository URL is correct and you have write access to it.

### If files are still being ignored:
```bash
# Force add a specific file if needed
git add -f filename

# Check what's being ignored
git check-ignore -v client/src/App.tsx
```