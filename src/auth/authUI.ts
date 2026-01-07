import { authService } from './authService';

export function renderLoginScreen(container: HTMLElement, onLoginSuccess: () => void) {
  // 1. Define the HTML Structure
  container.innerHTML = `
    <div class="auth-view">
      <div class="auth-card">
        <header class="auth-header">
          <h1 class="auth-title">✨ Writer Analytics</h1>
          <p class="auth-subtitle">Log in to unlock Beta features.</p>
        </header>

        <div id="auth-step-email">
          <div class="input-group">
            <label for="auth-email">Author Email</label>
            <input type="email" id="auth-email" placeholder="penname@example.com" />
          </div>
          <button id="send-otp-btn" class="primary-btn full-width">
            Continue with Magic Link
          </button>
          <p class="auth-note">Free plan includes tracking up to 2 stories.</p>
        </div>

        <div id="auth-step-otp" style="display: none;">
          <div class="input-group">
            <label for="auth-otp">Enter 6-Digit Code</label>
            <input type="text" id="auth-otp" placeholder="123456" maxlength="6" />
            <p class="helper-text">Check your inbox for the code.</p>
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

  // 2. Grab Elements
  const emailInput = container.querySelector('#auth-email') as HTMLInputElement;
  const otpInput = container.querySelector('#auth-otp') as HTMLInputElement;
  const sendBtn = container.querySelector('#send-otp-btn') as HTMLButtonElement;
  const verifyBtn = container.querySelector('#verify-otp-btn') as HTMLButtonElement;
  const backBtn = container.querySelector('#back-to-email') as HTMLButtonElement;
  const statusMsg = container.querySelector('#auth-status') as HTMLDivElement;

  const emailStep = container.querySelector('#auth-step-email') as HTMLDivElement;
  const otpStep = container.querySelector('#auth-step-otp') as HTMLDivElement;

  // 3. Event: Send OTP
  sendBtn.onclick = async () => {
    const email = emailInput.value.trim();
    if (!email) return (statusMsg.textContent = "Please enter your email.");

    try {
      sendBtn.disabled = true;
      sendBtn.textContent = "Sending...";
      await authService.sendOTP(email);
      
      emailStep.style.display = 'none';
      otpStep.style.display = 'block';
      statusMsg.textContent = "";
    } catch (err: any) {
      statusMsg.textContent = "Error: " + err.message;
      sendBtn.disabled = false;
      sendBtn.textContent = "Continue with Magic Link";
    }
  };

  // 4. Event: Verify OTP
  verifyBtn.onclick = async () => {
    const email = emailInput.value.trim();
    const code = otpInput.value.trim();
    
    try {
      verifyBtn.disabled = true;
      verifyBtn.textContent = "Verifying...";
      await authService.verifyOTP(email, code);
      onLoginSuccess(); // Trigger the callback (e.g., render the dashboard)
    } catch (err: any) {
      statusMsg.textContent = "Invalid code. Please try again.";
      verifyBtn.disabled = false;
      verifyBtn.textContent = "Verify & Enter";
    }
  };

  // 5. Event: Back to Email
  backBtn.onclick = () => {
    otpStep.style.display = 'none';
    emailStep.style.display = 'block';
    statusMsg.textContent = "";
    sendBtn.disabled = false;
    sendBtn.textContent = "Continue with Magic Link";
  };
}