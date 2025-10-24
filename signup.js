function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }
function show(el) { if (el) el.style.display = ''; }
function hide(el) { if (el) el.style.display = 'none'; }

function bufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(digest);
}
function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[\W_]/.test(pw)) score++;
  switch (score) {
    case 4: return 'Strong';
    case 3: return 'Good';
    case 2: return 'Weak';
    default: return 'Very weak';
  }
}

document.addEventListener('DOMContentLoaded', () => {

  const signupLink = $('#signup-link');
  const signupModal = $('#signup-modal');
  const signupClose = $('#signup-close');
  const signupBackdrop = $('#signup-backdrop');
  const signupForm = $('#signupForm');
  const usernameInput = $('#username');
  const displayNameInput = $('#displayName');
  const passwordInput = $('#password');
  const confirmPasswordInput = $('#confirmPassword');
  const pwFeedback = $('#pwFeedback');
  const formError = $('#formError');
  const signupBtn = $('#signupBtn');
  const skipSignup = $('#skip-signup');

  const welcomeArea = $('#welcome-area');
  const welcomeMsg = $('#welcome-msg');
  const signoutBtn = $('#signout-btn');

  function openModal() {
    if (!signupModal) return;
    signupModal.setAttribute('aria-hidden', 'false');
    signupModal.style.display = 'block';
    setTimeout(() => usernameInput?.focus(), 50);
  }
  function closeModal() {
    if (!signupModal) return;
    signupModal.setAttribute('aria-hidden', 'true');
    signupModal.style.display = 'none';
    clearFormFeedback();
    try { signupForm.reset(); } catch (e) { /* ignore */ }
  }

  if (signupLink) signupLink.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  if (signupClose) signupClose.addEventListener('click', closeModal);
  if (signupBackdrop) signupBackdrop.addEventListener('click', closeModal);
  if (skipSignup) skipSignup.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && signupModal && signupModal.style.display === 'block') closeModal();
  });

  function setFeedback(msg, isError = false) {
    if (isError) {
      if (formError) formError.textContent = msg;
    } else {
      if (pwFeedback) pwFeedback.textContent = msg;
    }
  }
  function clearFormFeedback() {
    if (pwFeedback) pwFeedback.textContent = '';
    if (formError) formError.textContent = '';
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      if (!pwFeedback) return;
      pwFeedback.textContent = `Password: ${passwordStrength(passwordInput.value)}`;
      if (confirmPasswordInput?.value && passwordInput.value !== confirmPasswordInput.value) {
        formError.textContent = 'Passwords do not match.';
      } else {
        formError.textContent = '';
      }
    });
  }
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', () => {
      if (!passwordInput) return;
      if (passwordInput.value !== confirmPasswordInput.value) {
        setFeedback('Passwords do not match.', true);
      } else {
        setFeedback(`Password: ${passwordStrength(passwordInput.value)}`);
        formError.textContent = '';
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormFeedback();

      const username = usernameInput?.value.trim() || '';
      const displayName = displayNameInput?.value.trim() || '';
      const password = passwordInput?.value || '';
      const confirmPassword = confirmPasswordInput?.value || '';

      if (!username || !displayName || !password || !confirmPassword) {
        setFeedback('Please fill in all fields.', true);
        return;
      }
      if (password.length < 6) {
        setFeedback('Password must be at least 6 characters.', true);
        return;
      }
      if (password !== confirmPassword) {
        setFeedback('Passwords do not match.', true);
        return;
      }

      const usersRaw = localStorage.getItem('opusUsers');
      const users = usersRaw ? JSON.parse(usersRaw) : [];
      if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        setFeedback('That username is already taken.', true);
        return;
      }

      try {
        const hashed = await hashPassword(password);
        const userObj = {
          username,
          displayName,
          passwordHash: hashed,
          createdAt: new Date().toISOString()
        };

        users.push(userObj);
        localStorage.setItem('opusUsers', JSON.stringify(users));

        localStorage.setItem('opusCurrentUser', JSON.stringify({ username: userObj.username, displayName: userObj.displayName }));

        localStorage.setItem('myplayer_user', userObj.displayName || userObj.username);

        closeModal();
        showWelcome(userObj.displayName || userObj.username);
      } catch (err) {
        console.error(err);
        setFeedback('An error occurred. Try again.', true);
      }
    });
  }

  function showWelcome(name) {
    if (!welcomeArea || !welcomeMsg) return;
    welcomeMsg.textContent = `Welcome, ${name}`;
    welcomeArea.style.display = 'flex';
    if (signupLink) signupLink.style.display = 'none';
  }

  function hideWelcome() {
    if (!welcomeArea || !welcomeMsg) return;
    welcomeMsg.textContent = '';
    welcomeArea.style.display = 'none';
    if (signupLink) signupLink.style.display = '';
    localStorage.removeItem('opusCurrentUser');
    localStorage.removeItem('myplayer_user');
  }

  if (signoutBtn) {
    signoutBtn.addEventListener('click', () => {
      hideWelcome();
    });
  }

  try {
    const cur = localStorage.getItem('opusCurrentUser');
    if (cur) {
      const u = JSON.parse(cur);
      showWelcome(u.displayName || u.username);
    } else {
      const legacy = localStorage.getItem('myplayer_user');
      if (legacy) {
        showWelcome(legacy);
      }
    }
  } catch (e) {
    console.error('Error reading user', e);
  }

  const localSignupForm = $('#signup-form-local');
  const localNameInput = $('#signup-name');

  if (localSignupForm && localNameInput) {

    const saved = localStorage.getItem('myplayer_user');
    if (saved) localNameInput.value = saved;

    localSignupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = localNameInput.value.trim();
      if (!name) {
        alert('Please enter a name');
        localNameInput.focus();
        return;
      }

      localStorage.setItem('myplayer_user', name);

      try {
        const usersRaw = localStorage.getItem('opusUsers');
        const users = usersRaw ? JSON.parse(usersRaw) : [];
        const username = name.replace(/\s+/g, '').toLowerCase().slice(0, 12) || name.toLowerCase();
        if (!users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
          const userObj = {
            username,
            displayName: name,
            passwordHash: null,
            createdAt: new Date().toISOString()
          };
          users.push(userObj);
          localStorage.setItem('opusUsers', JSON.stringify(users));
        }

        localStorage.setItem('opusCurrentUser', JSON.stringify({ username, displayName: name }));
      } catch (err) {
        console.error('Error creating opus user from legacy form', err);
      }

      // Redirect back to main page 
      window.location.href = 'index.html';
    });
  }

}); 

