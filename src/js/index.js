document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loader');
  
  try {
    firebase.initializeApp(firebaseConfig);
    
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        window.location.href = '/src/pages/home.html';
      } else {
        // Hide loader when showing landing page
        loader.classList.add('loader-hidden');
        setTimeout(() => loader.remove(), 300);
      }
    });
  } catch (error) {
    console.error("Firebase error:", error);
    loader.remove();
    // ... error handling ...
  }
});