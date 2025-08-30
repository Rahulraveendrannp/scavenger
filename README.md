# Talabat Scavenger Hunt

A mobile-first scavenger hunt game built with React, TypeScript, and Node.js, featuring QR code scanning and progress tracking.

## Features

- 🔐 **SMS OTP Authentication** - Uses Qatar SMS API for secure phone verification
- 🎮 **Scavenger Hunt Game** - 8 checkpoint adventure with QR code scanning
- 📊 **Progress Tracking** - Real-time progress saved to database
- 🏆 **Dashboard Games** - Multiple mini-games with completion tracking
- 📱 **Mobile Optimized** - Responsive design for mobile devices
- 🔄 **Session Management** - JWT-based authentication with automatic token refresh

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Lucide React for icons

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication
- Qatar SMS API for OTP delivery

## Quick Start

### Prerequisites
- Node.js 16+ 
- MongoDB (local or cloud)
- Qatar SMS API credentials

### 1. Clone and Install

```bash
git clone <repository-url>
cd Talabat
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create `.env` file:
```bash
cp env.example .env
```

Update `.env` with your credentials:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/talabat-scavenger-hunt
JWT_SECRET=your-super-secret-jwt-key-here
SMS_USERNAME=descifer
SMS_API_KEY=0OXJ6C2YHQ
FRONTEND_URL=http://localhost:5173
```

Start the server:
```bash
npm start
```

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## SMS Configuration

The app uses Qatar SMS API for OTP delivery. Configure your credentials in the server `.env` file:

```env
SMS_USERNAME=your_username
SMS_API_KEY=your_api_key
```

The SMS service sends OTPs via GET request to:
```
https://bhsms.net/httpget/?username=descifer&apikey=0OXJ6C2YHQ&to=917907996240&text=Your Talabat OTP is 4562. Valid for 5 minutes.
```

## Game Flow

1. **Registration** - User enters phone number
2. **OTP Verification** - 4-digit code sent via SMS
3. **Dashboard** - Shows available games and progress
4. **Scavenger Hunt** - 10 checkpoints with QR scanning
5. **Progress Tracking** - All progress saved to database

## API Endpoints

### Authentication
- `POST /api/auth/register` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/resend-otp` - Resend OTP

### Progress
- `GET /api/progress` - Get user progress
- `POST /api/progress/dashboard/:gameId/complete` - Complete dashboard game
- `POST /api/progress/scavenger/checkpoint/:checkpointId/complete` - Complete checkpoint

### Game
- `GET /api/game/progress` - Get game progress
- `POST /api/game/complete` - Complete game

## Database Models

### User
- Phone number, verification status
- OTP management (code, expiration, attempts)
- Game statistics

### UserProgress
- Dashboard games completion
- Scavenger hunt progress
- Current state tracking

## Development

### Running in Development
```bash
# Backend
cd server && npm run dev

# Frontend  
cd client && npm run dev
```

### Testing
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test
```

## Environment Variables

### Server (.env)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/talabat-scavenger-hunt
JWT_SECRET=your-super-secret-jwt-key-here
SMS_USERNAME=descifer
SMS_API_KEY=0OXJ6C2YHQ
FRONTEND_URL=http://localhost:5173
```

## Troubleshooting

### SMS Not Sending
- Check SMS API credentials in `.env`
- Verify phone number format (Qatar numbers only)
- Check server logs for API response

### Database Connection
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify database permissions

### Progress Not Saving
- Check JWT token validity
- Verify API endpoints are accessible
- Check server logs for errors

## License

MIT License - see LICENSE file for details
