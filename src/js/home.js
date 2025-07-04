document.addEventListener('DOMContentLoaded', () => {
  // Initialize Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  // Get DOM elements
  const userNameElement = document.getElementById('user-name');
  const signOutBtn = document.getElementById('sign-out-btn');
  const addEntryBtn = document.getElementById('add-entry-btn');
  const statisticsBtn = document.getElementById('statistics-btn');
  const loader = document.getElementById('loader');
  
  console.log('DOM loaded, starting auth state observer...');
  
  // Function to create user document with timeout and retry
  const createUserDocument = async (user) => {
    const userDocRef = db.collection('users').doc(user.uid);
    
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "New User",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.Timestamp.now(),
      bookCount: 0
    };
    
    console.log("🔥 Creating user document with data:", userData);
    
    try {
      // Add timeout wrapper to the set operation
      const setPromise = userDocRef.set(userData, { merge: true });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore set() timeout after 15 seconds')), 15000)
      );
      
      await Promise.race([setPromise, timeoutPromise]);
      console.log("✅ User document created successfully!");
      return true;
      
    } catch (error) {
      console.error("❌ Failed to create user document:", error);
      
      // Try with batch operation as fallback
      try {
        console.log("🔄 Trying batch operation as fallback...");
        const batch = db.batch();
        batch.set(userDocRef, userData, { merge: true });
        await batch.commit();
        console.log("✅ User document created with batch operation!");
        return true;
      } catch (batchError) {
        console.error("❌ Batch operation also failed:", batchError);
        return false;
      }
    }
  };
  
  // Use auth state observer
  auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed, user:', user);
    
    if (user) {
      // User is signed in
      const userId = user.uid;
      console.log('User ID:', userId);
      
      try {
        // Load user data from Firestore
        const doc = await db.collection('users').doc(userId).get();
        console.log('Firestore document exists:', doc.exists);
        
        if (doc.exists) {
          // User document exists - load and display data
          const userData = doc.data();
          console.log('Full user data from Firestore:', userData);
          
          // Update last login
          try {
            await db.collection('users').doc(userId).update({
              lastLogin: firebase.firestore.Timestamp.now()
            });
            console.log("✅ Last login updated");
          } catch (updateError) {
            console.error("Failed to update last login:", updateError);
          }
          
          // Update user info
          const displayName = userData.displayName || 'Reader';
          console.log('Setting display name to:', displayName);
          userNameElement.textContent = displayName;
          
        } else {
          // User document doesn't exist - create it
          console.log('🔥 No user document found, creating new one...');
          
          const success = await createUserDocument(user);
          
          if (success) {
            // Set display name without reloading
            console.log("✅ User document created successfully");
            userNameElement.textContent = user.displayName || user.email?.split('@')[0] || 'Reader';
          } else {
            // Fallback to basic display without Firestore data
            console.log("⚠️ Using fallback display without Firestore data");
            userNameElement.textContent = user.displayName || user.email?.split('@')[0] || 'Reader';
          }
        }
        
      } catch (error) {
        console.error('Error loading user data:', error);
        // Fallback to basic display
        userNameElement.textContent = user.displayName || user.email?.split('@')[0] || 'Reader';
      }
      
      // Hide loader once user data is loaded
      if (loader) {
        loader.classList.add('loader-hidden');
        setTimeout(() => {
          if (loader.parentNode) loader.parentNode.removeChild(loader);
        }, 300);
      }
      
    } else {
      // No user is signed in, redirect to index.html
      console.log('No user signed in, redirecting...');
      window.location.href = 'index.html';
    }
  });
  
  // Sign out functionality
  signOutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = 'index.html';
    }).catch(error => {
      console.error('Sign out error:', error);
    });
  });
  
  // Add new entry button functionality
  addEntryBtn.addEventListener('click', () => {
    alert('Add new entry functionality coming soon!');
  });
  
  // Statistics button functionality
  statisticsBtn.addEventListener('click', () => {
    alert('Statistics functionality coming soon!');
  });

  // Fallback loader hide (in case auth state doesn't change)
  setTimeout(() => {
    if (loader && !loader.classList.contains('loader-hidden')) {
      loader.classList.add('loader-hidden');
      setTimeout(() => {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 300);
    }
  }, 3000);
});