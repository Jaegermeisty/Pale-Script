// auth.js - Updated with Firestore integration
document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loader');
  
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    // Get Firestore database instance
    const db = firebase.firestore();
    
    // Set authentication persistence
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => {
        // Listen for authentication state changes
        firebase.auth().onAuthStateChanged(async (user) => {  // Added async here
          if (user) {
            // USER IS LOGGED IN - Check if we need to create user document
            
            try {
              // Check if user document already exists
              const userDoc = await db.collection('users').doc(user.uid).get();
              
              if (!userDoc.exists) {
                // NEW USER - Create document in Firestore
                await db.collection('users').doc(user.uid).set({
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName || "New User", // Use actual name if available
                  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                  lastLogin: new Date(),
                  bookCount: 0
                });
                console.log("New user document created for:", user.email);
              } else {
                // EXISTING USER - Update last login time
                await db.collection('users').doc(user.uid).update({
                  lastLogin: new Date()
                });
                console.log("Existing user logged in:", user.email);
              }
            } catch (error) {
              console.error("Firestore error:", error);
              // Continue to home page even if Firestore fails
            }
            
            // Redirect to home page
            window.location.assign('/src/pages/home.html');
            
          } else {
            // USER IS NOT LOGGED IN - Show login UI
            
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
        // ... error handling ...
      });
  } catch (error) {
    console.error("Firebase initialization error:", error);
    loader.classList.add('loader-hidden');
    setTimeout(() => loader.remove(), 300);
    // ... error handling ...
  }
});