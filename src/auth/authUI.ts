import { authService } from './authService';

/**
 * Renders the Auth UI and handles persistent state for OTP.
 */
export async function renderLoginScreen(container: HTMLElement, onLoginSuccess: () => void) {
  // 1. Check if we were already waiting for a code (prevents UI reset on popup close)
  const { pendingEmail } = await chrome.storage.local.get('pendingEmail');

  const renderUI = (showOTP: boolean = false, savedEmail: string = "") => {
    container.innerHTML = `
      <div class="auth-view">
        <div class="auth-card">
          <header class="auth-header">
            <h1 class="auth-title">✨ Writer Analytics</h1>
            <p class="auth-subtitle">Log in to unlock Beta features.</p>
          </header>

          <div id="auth-step-email" style="display: ${showOTP ? 'none' : 'block'};">
            <div class="input-group">
              <label for="auth-email">Author Email</label>
              <input type="email" id="auth-email" placeholder="penname@example.com" value="${savedEmail}" />
            </div>
            <button id="send-otp-btn" class="primary-btn full-width">
              Send Login Code
            </button>
            <p class="auth-note">Free plan includes tracking up to 2 stories.</p>
          </div>

          <div id="auth-step-otp" style="display: ${showOTP ? 'block' : 'none'};">
            <div class="input-group">
              <label for="auth-otp">Enter 6-Digit Code</label>
              <input type="text" id="auth-otp" placeholder="123456" maxlength="6" inputmode="numeric" />
              <p class="helper-text">Code sent to your email. Check your spam if missing.</p>
            </div>
            <button id="verify-otp-btn" class="primary-btn full-width">
              Verify & Enter
            </button>
            <button id="back-to-email" class="text-btn">← Change Email</button>
          </div>

          <div id="auth-status" class="status-msg"></div>
        </div>
      </div>
    `;
    attachListeners();
  };

  const attachListeners = () => {
    const emailInput = container.querySelector('#auth-email') as HTMLInputElement;
    const otpInput = container.querySelector('#auth-otp') as HTMLInputElement;
    const sendBtn = container.querySelector('#send-otp-btn') as HTMLButtonElement;
    const verifyBtn = container.querySelector('#verify-otp-btn') as HTMLButtonElement;
    const backBtn = container.querySelector('#back-to-email') as HTMLButtonElement;
    const statusMsg = container.querySelector('#auth-status') as HTMLDivElement;

    const emailStep = container.querySelector('#auth-step-email') as HTMLDivElement;
    const otpStep = container.querySelector('#auth-step-otp') as HTMLDivElement;

    // EVENT: SEND OTP
    sendBtn.onclick = async () => {
      const email = emailInput.value.trim();
      if (!email) return (statusMsg.textContent = "Please enter your email.");

      try {
        sendBtn.disabled = true;
        sendBtn.textContent = "Sending...";
        await authService.sendOTP(email);
        
        // 🔥 PERSISTENCE: Save email so UI remembers state if popup closes
        await chrome.storage.local.set({ pendingEmail: email });
        
        emailStep.style.display = 'none';
        otpStep.style.display = 'block';
        statusMsg.textContent = "";
      } catch (err: any) {
        statusMsg.textContent = "Error: " + err.message;
        sendBtn.disabled = false;
        sendBtn.textContent = "Send Login Code";
      }
    };

    // EVENT: VERIFY OTP
    verifyBtn.onclick = async () => {
      const currentPending = (await chrome.storage.local.get('pendingEmail')).pendingEmail;
      const email = emailInput.value.trim() || currentPending;
      const code = otpInput.value.trim();
      
      if (code.length < 6) return (statusMsg.textContent = "Please enter the full 6-digit code.");

      try {
        verifyBtn.disabled = true;
        verifyBtn.textContent = "Verifying...";
        await authService.verifyOTP(email, code);
        
        // ✅ CLEANUP: Remove pending state on success
        await chrome.storage.local.remove('pendingEmail');
        onLoginSuccess();
      } catch (err: any) {
        statusMsg.textContent = "Invalid code. Please try again.";
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify & Enter";
      }
    };

    // EVENT: BACK TO EMAIL
    backBtn.onclick = async () => {
      await chrome.storage.local.remove('pendingEmail');
      emailStep.style.display = 'block';
      otpStep.style.display = 'none';
      statusMsg.textContent = "";
      sendBtn.disabled = false;
      sendBtn.textContent = "Send Login Code";
    };
  };

  // Initial UI Render based on state
  renderUI(!!pendingEmail, pendingEmail || "");
}