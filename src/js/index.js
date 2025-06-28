document.addEventListener('DOMContentLoaded', () => {
  try {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    
    // Check authentication state
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        // User is signed in, redirect to home page
        window.location.href = '/src/pages/home.html';
      }
      // If not signed in, do nothing (show landing page)
    });
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // Optional: Show error message on page
    // document.body.innerHTML += `<p class="error">Error loading app: ${error.message}</p>`;
  }
});