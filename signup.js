document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signup-form-local');
  const nameInput = document.getElementById('signup-name');

  const saved = localStorage.getItem('myplayer_user');
  if (saved) nameInput.value = saved;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      alert('Please enter a name');
      nameInput.focus();
      return;
    }
    localStorage.setItem('myplayer_user', name);

    window.location.href = 'index.html';
  });
});
