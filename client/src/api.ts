// api.ts - Twilio OTP Implementation
import type{ ApiResponse, OTPVerificationResponse, GameProgress } from './types';

const API_BASE = 'http://localhost:5000/api';

function setToken(token: string) {
  localStorage.setItem('jwt_token', token);
}
function getToken(): string | null {
  return localStorage.getItem('jwt_token');
}
function clearToken() {
  localStorage.removeItem('jwt_token');
}

export class ScavengerAPI {
  // Send OTP using Twilio (server-side)
  static async registerUser(phoneNumber: string): Promise<ApiResponse<{ otpSent: boolean; isTestNumber?: boolean }>> {
    try {
      console.log('Sending Twilio OTP to:', phoneNumber);
      
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Twilio OTP sent successfully');
        return {
          success: true,
          data: { 
            otpSent: true,
            isTestNumber: false
          }
        };
      } else {
        return {
          success: false,
          error: data.message || 'Failed to send OTP'
        };
      }
    } catch (error) {
      console.error('Twilio OTP error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  }

  // Verify OTP using Twilio (server-side)
  static async verifyOTP(phoneNumber: string, otpCode: string): Promise<OTPVerificationResponse> {
    try {
      console.log('Verifying Twilio OTP for:', phoneNumber, 'Code:', otpCode);
      
      const response = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otpCode })
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.token) {
        setToken(data.data.token);
        
        // Create game session
        const gameSession = {
          userId: data.data.session.userId,
          phoneNumber,
          startTime: Date.now(),
          totalCheckpoints: 8,
          hintCredits: 3,
          qrsScanned: 0,
          route: Array.from({ length: 8 }, (_, i) => ({
            id: i + 1,
            location: 'Pages & Pencils',
            clue: 'Pages and pencils, worlds to explore — find the door that always has more.',
            hint: 'Look for the big red A at the entrance.',
            isCompleted: false,
            isExpanded: false
          }))
        };
        
        return {
          success: true,
          session: gameSession
        };
      } else {
        return {
          success: false,
          error: data.message || 'Invalid OTP'
        };
      }
    } catch (error) {
      console.error('Twilio verification error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  }

  // Resend OTP using Twilio
  static async resendOTP(phoneNumber: string): Promise<ApiResponse<{ otpSent: boolean }>> {
    try {
      const response = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          data: { otpSent: true }
        };
      } else {
        return {
          success: false,
          error: data.message || 'Failed to resend OTP'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  }

  // Logout
  static async logout() {
    try {
      clearToken();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  static async submitGameCompletion(
    phoneNumber: string,
    sessionId?: string
  ): Promise<ApiResponse<{ saved?: boolean }>> {
    try {
      const token = getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      if (!sessionId) {
        console.warn('No sessionId available; skipping backend completion call');
        return { success: true, data: { saved: false } };
      }

      const response = await fetch(`${API_BASE}/game/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, phoneNumber }),
      });

      const json = await response.json();
      if (!response.ok) {
        return { success: false, error: json?.message || 'Failed to submit completion' };
      }

      return { success: true, data: json.data };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Network error' };
    }
  }

  static async useHint(
    checkpointId: number
  ): Promise<ApiResponse<{ hint: string; hintCredits: number }>> {
    try {
      const token = getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${API_BASE}/game/use-hint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ checkpointId }),
      });

      const json = await response.json();
      if (!response.ok) {
        return { success: false, error: json?.message || 'Failed to use hint' };
      }

      return { success: true, data: json.data };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Network error' };
    }
  }

  static async getGameProgress(): Promise<ApiResponse<GameProgress>> {
    try {
      const token = getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${API_BASE}/game/progress`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await response.json();
      if (!response.ok) {
        return { success: false, error: json?.message || 'Failed to load progress' };
      }

      return { success: true, data: json.data };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Network error' };
    }
  }

  static getLeaderboard() {
    throw new Error('Method not implemented.');
  }
}