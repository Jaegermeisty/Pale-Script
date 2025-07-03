// auth.js - Simplified version without Firestore operations
document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loader');
  
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    // Set authentication persistence
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => {
        // Listen for authentication state changes
        firebase.auth().onAuthStateChanged((user) => {
          if (user) {
            // USER IS LOGGED IN - Just redirect to home page
            console.log("User authenticated:", user.uid, user.email);
            console.log("Redirecting to home page...");
            window.location.assign('/src/pages/home.html');
            
          } else {
            // USER IS NOT LOGGED IN - Show login UI
            console.log("No user authenticated, showing login UI");
            
            // FirebaseUI configuration
            const uiConfig = {
              signInOptions: [
                {
                  provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                  customParameters: { prompt: 'select_account' }
                },
                {
                  provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
                }
              ],
              signInSuccessUrl: '/src/pages/home.html',
              credentialHelper: firebaseui.auth.CredentialHelper.NONE,
              signInFlow: 'popup'
            };
            
            // Initialize and start FirebaseUI
            const ui = new firebaseui.auth.AuthUI(firebase.auth());
            ui.start('#firebaseui-auth-container', uiConfig);
            
            // Hide loader after UI renders
            setTimeout(() => {
              loader.classList.add('loader-hidden');
              setTimeout(() => loader.remove(), 300);
            }, 500);
          }
        });
      })
      .catch((error) => {
        console.error("Persistence error:", error);
        loader.classList.add('loader-hidden');
        setTimeout(() => loader.remove(), 300);
      });
  } catch (error) {
    console.error("Firebase initialization error:", error);
    loader.classList.add('loader-hidden');
    setTimeout(() => loader.remove(), 300);
  }
});