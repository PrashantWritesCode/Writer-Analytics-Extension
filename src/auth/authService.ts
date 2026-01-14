import { supabase } from './supabase';
import { renderLoginScreen } from './authUI';

export const authService = {
  /**
   * 1. REQUEST OTP
   * Sends a 6-digit code to the user's email.
   */
  async sendOTP(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // This ensures the user is created in your DB if they don't exist
        shouldCreateUser: true, 
      }
    });
    if (error) throw error;
    return true;
  },

  /**
   * 2. VERIFY OTP
   * Validates the 6-digit code and starts the session.
   */
  async verifyOTP(email: string, token: string) {
    const { data: { session }, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) throw error;

    if (session?.user) {
      // Sync the user's plan and limit to local storage for fast UI checks
      await this.syncUserLimit(session.user.id);
    }
    return session;
  },

  /**
   * 3. SYNC LIMITS
   * Fetches the 2-story limit from Supabase and saves it locally.
   */
  async syncUserLimit(userId: string) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan, story_limit')
      .eq('user_id', userId)
      .single();

    if (data) {
      await chrome.storage.local.set({
        userTier: {
          plan: data.plan,
          storyLimit: data.story_limit
        }
      });
    }
  },

  /**
   * 4. LOGOUT
   */
  async logout() {
    await supabase.auth.signOut();
    await chrome.storage.local.remove(['wa_auth_session', 'userTier']);
  },

  /**
   * CENTRALIZED AUTH CHECK
   * Checks if session is valid. If expired, shows login screen.
   * If valid, executes the feature logic.
   */
async ensureAuth(container: HTMLElement, runFeature: (session: any) => void) {
    const { data: { session } } = await supabase.auth.getSession();

    // 1. Get current time in seconds
    const nowInSeconds = Math.floor(Date.now() / 1000);

    // 2. Validate session and expiry timestamp
    if (session && session.expires_at && session.expires_at > nowInSeconds) {
      // Token is valid and NOT expired
      runFeature(session);
    } else {
      // Token is missing or expired (session.expires_at <= nowInSeconds)
      console.warn("Session expired based on timestamp. Redirecting to login.");
      
      // Clean up local state if necessary
      await this.logout(); 

      renderLoginScreen(container, () => {
        this.ensureAuth(container, runFeature);
      });
    }
  }
};