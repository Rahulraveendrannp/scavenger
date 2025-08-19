# QR Codes Reference - Talabat Gaming Hub

## First 3 Games (Dashboard)

### Card Game

**QR Code:** `TALABAT_CARD_COMPLETE`

- Scan this to mark the Card Game as completed

### Puzzle

**QR Code:** `TALABAT_PUZZLE_COMPLETE`

- Scan this to mark the Puzzle as completed

### Car Race

**QR Code:** `TALABAT_RACE_COMPLETE`

- Scan this to mark the Car Race as completed

### Scavenger Hunt Entry

**QR Code:** `TALABAT_SCAVENGER_ENTRY`

- Scan this to enter the Scavenger Hunt

## Scavenger Hunt Checkpoints

### 1. Reception Desk

**QR Code:** `TALABAT_HUNT_RECEPTION_DESK`

- Location: Where visitors first arrive and greet the team
- Hint: Look near the main entrance for a welcome sign

### 2. Conference Room

**QR Code:** `TALABAT_HUNT_CONFERENCE_ROOM`

- Location: Round tables and big screens, where important meetings convene
- Hint: Check the large room with glass walls

### 3. Kitchen Area

**QR Code:** `TALABAT_HUNT_KITCHEN_AREA`

- Location: Coffee brews and lunch is made, where hungry workers get fed
- Hint: Look for appliances and the coffee machine

### 4. Supply Closet

**QR Code:** `TALABAT_HUNT_SUPPLY_CLOSET`

- Location: Papers, pens, and office gear, stored neatly for all to share
- Hint: Find the room with shelves full of office supplies

### 5. Manager Office

**QR Code:** `TALABAT_HUNT_MANAGER_OFFICE`

- Location: Corner room with the best view, where important decisions come through
- Hint: Look for the private office with windows

### 6. Break Room

**QR Code:** `TALABAT_HUNT_BREAK_ROOM`

- Location: Relax and unwind, leave your work behind, comfy chairs you will find
- Hint: Check the area with couches and recreational items

### 7. IT Department

**QR Code:** `TALABAT_HUNT_IT_DEPARTMENT`

- Location: Cables and servers, tech support that never defers
- Hint: Look for the area with lots of computer equipment

### 8. Main Workspace

**QR Code:** `TALABAT_HUNT_MAIN_WORKSPACE`

- Location: Desks in rows, where daily productivity flows
- Hint: Find the open area with multiple workstations

## Flow Instructions

1. **Registration** - Visit localhost:5137 (starts on registration page)
2. **OTP Verification** - Enter 6-digit OTP code
3. **Dashboard** - Complete first 3 games and enter scavenger hunt
4. **Scavenger Hunt** - Find and scan QR codes for each location
5. **Hints System** - 3 hints available, initially hidden, click to reveal

## Features Implemented

✅ **Responsive Design** - All pages optimized for mobile view
✅ **Registration Flow** - Registration page is now the first page
✅ **QR Code System** - Predefined QR codes for all games and checkpoints
✅ **Hints System** - 3 hints initially hidden, click to reveal
✅ **Mobile Optimization** - Responsive layouts with mobile-first design
✅ **Authentication & Persistence** - User sessions and progress saved in localStorage
✅ **User Progress Tracking** - Game completion status and scavenger hunt progress tracked
✅ **Fixed QR Scanner Flow** - QR scanner now correctly returns to game page on success

## Authentication & Data Persistence

### User Session Management

- Phone number and game session stored in localStorage
- Auto-redirect to dashboard if already authenticated
- Proper logout functionality clears all data

### Progress Tracking

- **Dashboard Games**: Progress saved as `talabat_user_progress`
- **Scavenger Hunt**: Progress saved as `talabat_scavenger_progress`
- **Hint System**: Revealed hints and remaining credits persisted
- **Checkpoint Status**: Completed checkpoints tracked per user

### Data Stored in localStorage

```javascript
talabat_phone_number; // User's phone number
talabat_game_session; // Current game session
talabat_user_progress; // Dashboard game completion status
talabat_scavenger_progress; // Scavenger hunt progress & hints
talabat_completion_data; // Game completion times and scores
talabat_current_checkpoint; // Current checkpoint in progress
```
