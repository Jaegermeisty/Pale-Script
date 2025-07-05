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
  const emptyState = document.getElementById('empty-state');
  const booksGrid = document.getElementById('books-grid');
  
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
  
  // Function to load and display books
  const loadBooks = async (userId) => {
    try {
      console.log('📚 Loading books for user:', userId);
      
      // Get all books for the user
      const booksSnapshot = await db.collection('users').doc(userId).collection('books').get();
      
      if (booksSnapshot.empty) {
        console.log('No books found');
        emptyState.style.display = 'flex';
        booksGrid.style.display = 'none';
        return;
      }
      
      const books = [];
      
      // For each book, get entry count and most recent entry
      for (const bookDoc of booksSnapshot.docs) {
        const bookData = bookDoc.data();
        const bookId = bookDoc.id;
        
        try {
          console.log(`📖 Processing book: ${bookData.title}`);
          
          // Get all chapters for this book
          const chaptersSnapshot = await db.collection('users').doc(userId)
            .collection('books').doc(bookId)
            .collection('chapters').get();
          
          let totalEntries = 0;
          let mostRecentEntryDate = null;
          
          // For each chapter, count entries and find most recent
          for (const chapterDoc of chaptersSnapshot.docs) {
            const chapterId = chapterDoc.id;
            
            // Get all entries in this chapter
            const entriesSnapshot = await db.collection('users').doc(userId)
              .collection('books').doc(bookId)
              .collection('chapters').doc(chapterId)
              .collection('entries')
              .orderBy('createdAt', 'desc')
              .get();
            
            totalEntries += entriesSnapshot.size;
            
            // Check if this chapter has the most recent entry
            if (!entriesSnapshot.empty) {
              const firstEntry = entriesSnapshot.docs[0];
              const entryDate = firstEntry.data().createdAt;
              
              if (!mostRecentEntryDate || entryDate > mostRecentEntryDate) {
                mostRecentEntryDate = entryDate;
              }
            }
          }
          
          console.log(`📊 Book "${bookData.title}": ${totalEntries} entries, last: ${mostRecentEntryDate}`);
          
          // Use book creation date if no entries found
          const lastEntryDate = mostRecentEntryDate || bookData.createdAt || new Date(0);
          
          books.push({
            id: bookId,
            ...bookData,
            entryCount: totalEntries,
            lastEntryDate: lastEntryDate
          });
          
        } catch (error) {
          console.error(`Error loading entries for book ${bookId}:`, error);
          // Add book without entry data if there's an error
          books.push({
            id: bookId,
            ...bookData,
            entryCount: 0,
            lastEntryDate: bookData.createdAt || new Date(0)
          });
        }
      }
      
      // Sort books by most recent entry date (newest first)
      books.sort((a, b) => {
        const dateA = a.lastEntryDate?.toDate ? a.lastEntryDate.toDate() : new Date(a.lastEntryDate);
        const dateB = b.lastEntryDate?.toDate ? b.lastEntryDate.toDate() : new Date(b.lastEntryDate);
        return dateB - dateA;
      });
      
      console.log('📚 Final books with counts:', books);
      displayBooks(books);
      
    } catch (error) {
      console.error('Error loading books:', error);
      emptyState.style.display = 'flex';
      booksGrid.style.display = 'none';
    }
  };
  
  // Function to display books in the grid
  const displayBooks = (books) => {
    if (books.length === 0) {
      emptyState.style.display = 'flex';
      booksGrid.style.display = 'none';
      return;
    }
    
    emptyState.style.display = 'none';
    booksGrid.style.display = 'grid';
    
    booksGrid.innerHTML = books.map(book => {
      const lastEntryDate = book.lastEntryDate?.toDate ? book.lastEntryDate.toDate() : new Date(book.lastEntryDate);
      const timeAgo = getTimeAgo(lastEntryDate);
      
      return `
        <div class="book-card" data-book-id="${book.id}">
          <div class="book-cover-section">
            ${book.coverUrl ? 
              `<img src="${book.coverUrl}" alt="${book.title}" class="book-cover-image" />` :
              `<div class="book-cover-placeholder">
                <span>${book.title}</span>
              </div>`
            }
          </div>
          <div class="book-info">
            <h3 class="book-title">${book.title}</h3>
            <p class="book-author">${book.authors.join(', ')}</p>
            <div class="book-meta">
              <span class="book-entries-count">${book.entryCount} ${book.entryCount === 1 ? 'entry' : 'entries'}</span>
              <span class="book-last-entry">${timeAgo}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Add click handlers to book cards
    document.querySelectorAll('.book-card').forEach(card => {
      card.addEventListener('click', () => {
        const bookId = card.dataset.bookId;
        // Navigate to book detail page
        window.location.href = `/src/pages/book-detail.html?id=${bookId}`;
      });
    });
  };
  
  // Helper function to format time ago
  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    return `${Math.floor(diffInSeconds / 31536000)}y ago`;
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
        
        // Load books after user setup
        await loadBooks(userId);
        
      } catch (error) {
        console.error('Error loading user data:', error);
        // Fallback to basic display
        userNameElement.textContent = user.displayName || user.email?.split('@')[0] || 'Reader';
        emptyState.style.display = 'flex';
        booksGrid.style.display = 'none';
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
  
  // Add new entry button functionality - navigate to new entry page
  addEntryBtn.addEventListener('click', () => {
    window.location.href = '/src/pages/new-entry.html';
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