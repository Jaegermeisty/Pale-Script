document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loader');
  
  try {
    firebase.initializeApp(firebaseConfig);
    
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => {
        firebase.auth().onAuthStateChanged((user) => {
          if (user) {
            window.location.assign('/src/pages/home.html');
          } else {
            // Initialize FirebaseUI
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
        // ... error handling ...
      });
  } catch (error) {
    console.error("Firebase error:", error);
    loader.classList.add('loader-hidden');
    setTimeout(() => loader.remove(), 300);
    // ... error handling ...
  }
});