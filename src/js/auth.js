document.addEventListener('DOMContentLoaded', () => {
  try {
    firebase.initializeApp(firebaseConfig);
    
    // Set authentication persistence
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => {
        // Check if user is already signed in
        firebase.auth().onAuthStateChanged((user) => {
          if (user) {
            // User is signed in, redirect to home page
            window.location.assign('/src/pages/home.html');
          } else {
            // Initialize FirebaseUI if not signed in
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
            
            const ui = new firebaseui.auth.AuthUI(firebase.auth());
            ui.start('#firebaseui-auth-container', uiConfig);
          }
        });
      })
      .catch((error) => {
        console.error("Persistence error:", error);
        document.getElementById('firebaseui-auth-container').innerHTML = `
          <p class="error">${error.message}</p>
        `;
      });
  } catch (error) {
    console.error("Firebase error:", error);
    document.getElementById('firebaseui-auth-container').innerHTML = `
      <p class="error">${error.message}</p>
    `;
  }
});