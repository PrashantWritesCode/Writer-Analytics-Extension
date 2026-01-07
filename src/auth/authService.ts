import { supabase } from './supabase';

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
  }
};