/**
 * Authentication Type Definitions
 */

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  // Garmin integration
  garminLinked: boolean;
  garminUserId?: string;
  // User preferences
  preferences: UserPreferences;
}

export interface UserPreferences {
  units: "metric" | "imperial";
  weekStartsOn: 0 | 1 | 6; // Sunday, Monday, Saturday
  timezone: string;
  notifications: {
    email: boolean;
    workoutReminders: boolean;
    planUpdates: boolean;
  };
}

export interface AuthState {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthContextType extends AuthState {
  // Email/Password auth
  signUp: (credentials: RegisterCredentials) => Promise<void>;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<AppUser>) => Promise<void>;

  // Social auth
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithStrava: () => Promise<void>;

  // Garmin integration
  linkGarminAccount: (garminUserId: string) => Promise<void>;
  unlinkGarminAccount: () => Promise<void>;
}

export type SocialProvider = "google" | "apple" | "strava";
