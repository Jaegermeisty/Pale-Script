document.addEventListener('DOMContentLoaded', () => {
  // Initialize Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  // Get DOM elements
  const loader = document.getElementById('loader');
  const backBtn = document.getElementById('back-btn');
  const newEntryBtn = document.getElementById('new-entry-btn');
  const bookTitleDisplay = document.getElementById('book-title-display');
  const bookCoverImageLarge = document.getElementById('book-cover-image-large');
  const bookCoverPlaceholderLarge = document.getElementById('book-cover-placeholder-large');
  const bookTitleMain = document.getElementById('book-title-main');
  const bookAuthorMain = document.getElementById('book-author-main');
  const bookYearMain = document.getElementById('book-year-main');
  const totalEntries = document.getElementById('total-entries');
  const totalChapters = document.getElementById('total-chapters');
  const chapterFilter = document.getElementById('chapter-filter');
  const tagSearch = document.getElementById('tag-search');
  const clearFilters = document.getElementById('clear-filters');
  const activeTags = document.getElementById('active-tags');
  const entriesCount = document.getElementById('entries-count');
  const entriesContainer = document.getElementById('entries-container');
  const noEntries = document.getElementById('no-entries');
  
  // State
  let currentUser = null;
  let currentBookId = null;
  let currentBookData = null;
  let allEntries = [];
  let allChapters = [];
  let filteredEntries = [];
  let activeTagsList = [];
  
  // Get book ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  currentBookId = urlParams.get('id');
  
  if (!currentBookId) {
    showToast('No book ID provided', 'error');
    setTimeout(() => {
      window.location.href = '/src/pages/home.html';
    }, 2000);
    return;
  }
  
  // Authentication check
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadBookData();
      hideLoader();
    } else {
      window.location.href = '/src/pages/auth.html';
    }
  });
  
  // Back button
  backBtn.addEventListener('click', () => {
    window.location.href = '/src/pages/home.html';
  });
  
  // New Entry button
  newEntryBtn.addEventListener('click', () => {
    // Navigate to new entry page with book ID parameter
    window.location.href = `/src/pages/new-entry.html?bookId=${currentBookId}`;
  });
  
  // Hide loader
  const hideLoader = () => {
    if (loader) {
      loader.classList.add('loader-hidden');
      setTimeout(() => {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 300);
    }
  };
  
  // Load book data
  const loadBookData = async () => {
    try {
      console.log('📚 Loading book data for ID:', currentBookId);
      
      // Get book document
      const bookDoc = await db.collection('users').doc(currentUser.uid)
        .collection('books').doc(currentBookId).get();
      
      if (!bookDoc.exists) {
        showToast('Book not found', 'error');
        setTimeout(() => {
          window.location.href = '/src/pages/home.html';
        }, 2000);
        return;
      }
      
      currentBookData = { id: bookDoc.id, ...bookDoc.data() };
      console.log('📖 Book data:', currentBookData);
      
      // Display book information
      displayBookInfo();
      
      // Load chapters and entries
      await loadChaptersAndEntries();
      
    } catch (error) {
      console.error('Error loading book data:', error);
      showToast('Error loading book data', 'error');
    }
  };
  
  // Display book information
  const displayBookInfo = () => {
    const title = currentBookData.title || 'Unknown Title';
    const authors = currentBookData.authors || ['Unknown Author'];
    const year = currentBookData.publishYear || 'Unknown Year';
    
    // Update all title elements
    bookTitleDisplay.textContent = title;
    bookTitleMain.textContent = title;
    bookAuthorMain.textContent = authors.join(', ');
    bookYearMain.textContent = year;
    
    // Handle cover image
    if (currentBookData.coverUrl) {
      const img = new Image();
      img.onload = () => {
        bookCoverImageLarge.src = currentBookData.coverUrl;
        bookCoverImageLarge.style.display = 'block';
        bookCoverPlaceholderLarge.style.display = 'none';
        
        // Simple sizing - let it be natural
        bookCoverImageLarge.style.maxWidth = '200px';
        bookCoverImageLarge.style.width = 'auto';
        bookCoverImageLarge.style.height = 'auto';
      };
      img.onerror = () => {
        bookCoverImageLarge.style.display = 'none';
        bookCoverPlaceholderLarge.style.display = 'flex';
      };
      img.src = currentBookData.coverUrl;
    } else {
      bookCoverImageLarge.style.display = 'none';
      bookCoverPlaceholderLarge.style.display = 'flex';
    }
  };
  
  // Load chapters and entries
  const loadChaptersAndEntries = async () => {
    try {
      console.log('📁 Loading chapters and entries...');
      
      // Get all chapters
      const chaptersSnapshot = await db.collection('users').doc(currentUser.uid)
        .collection('books').doc(currentBookId)
        .collection('chapters')
        .orderBy('order', 'asc')
        .get();
      
      allChapters = chaptersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📁 Chapters loaded:', allChapters);
      
      // Load entries from all chapters
      allEntries = [];
      for (const chapter of allChapters) {
        const entriesSnapshot = await db.collection('users').doc(currentUser.uid)
          .collection('books').doc(currentBookId)
          .collection('chapters').doc(chapter.id)
          .collection('entries')
          .orderBy('createdAt', 'desc')
          .get();
        
        const chapterEntries = entriesSnapshot.docs.map(doc => ({
          id: doc.id,
          chapterId: chapter.id,
          chapterName: chapter.name,
          ...doc.data()
        }));
        
        allEntries.push(...chapterEntries);
      }
      
      // Sort all entries by creation date (newest first)
      allEntries.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB - dateA;
      });
      
      console.log('📝 All entries loaded:', allEntries);
      
      // Update stats
      totalEntries.textContent = allEntries.length;
      totalChapters.textContent = allChapters.length;
      
      // Populate chapter dropdown
      populateChapterDropdown();
      
      // Apply initial filters
      applyFilters();
      
    } catch (error) {
      console.error('Error loading chapters and entries:', error);
      showToast('Error loading entries', 'error');
    }
  };
  
  // Populate chapter dropdown
  const populateChapterDropdown = () => {
    chapterFilter.innerHTML = '<option value="">All Chapters</option>';
    
    allChapters.forEach(chapter => {
      const option = document.createElement('option');
      option.value = chapter.id;
      option.textContent = chapter.name;
      chapterFilter.appendChild(option);
    });
  };
  
  // Apply filters
  const applyFilters = () => {
    const selectedChapter = chapterFilter.value;
    
    // Start with all entries
    filteredEntries = [...allEntries];
    
    // Filter by chapter if selected
    if (selectedChapter) {
      filteredEntries = filteredEntries.filter(entry => entry.chapterId === selectedChapter);
    }
    
    // Filter by tags if any active
    if (activeTagsList.length > 0) {
      filteredEntries = filteredEntries.filter(entry => {
        return activeTagsList.every(tag => 
          entry.tags && entry.tags.some(entryTag => 
            entryTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
      });
    }
    
    console.log('🔍 Filtered entries:', filteredEntries.length);
    displayEntries();
  };
  
  // Display entries
  const displayEntries = () => {
    entriesCount.textContent = `${filteredEntries.length} ${filteredEntries.length === 1 ? 'entry' : 'entries'}`;
    
    if (filteredEntries.length === 0) {
      entriesContainer.style.display = 'none';
      noEntries.style.display = 'block';
      return;
    }
    
    entriesContainer.style.display = 'block';
    noEntries.style.display = 'none';
    
    entriesContainer.innerHTML = filteredEntries.map(entry => {
      const date = entry.createdAt?.toDate() || new Date();
      const formattedDate = formatDate(date);
      const timeAgo = getTimeAgo(date);
      
      return `
        <div class="entry-card">
          <div class="entry-header">
            <span class="entry-chapter">${entry.chapterName}</span>
            <div class="entry-date" title="${formattedDate}">${timeAgo}</div>
          </div>
          <div class="entry-content">${entry.content}</div>
          ${entry.tags && entry.tags.length > 0 ? `
            <div class="entry-tags">
              ${entry.tags.map(tag => `<span class="entry-tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  };
  
  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get time ago string
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
  
  // Chapter filter change
  chapterFilter.addEventListener('change', applyFilters);
  
  // Tag search functionality
  tagSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTagsFromInput();
    }
  });
  
  const addTagsFromInput = () => {
    const input = tagSearch.value.trim();
    if (!input) return;
    
    const newTags = input.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    newTags.forEach(tag => {
      if (!activeTagsList.includes(tag)) {
        activeTagsList.push(tag);
      }
    });
    
    tagSearch.value = '';
    updateActiveTagsDisplay();
    applyFilters();
  };
  
  // Update active tags display
  const updateActiveTagsDisplay = () => {
    activeTags.innerHTML = activeTagsList.map(tag => `
      <div class="active-tag">
        <span>${tag}</span>
        <button class="remove-tag" onclick="removeTag('${tag}')">×</button>
      </div>
    `).join('');
  };
  
  // Remove tag
  window.removeTag = (tag) => {
    activeTagsList = activeTagsList.filter(t => t !== tag);
    updateActiveTagsDisplay();
    applyFilters();
  };
  
  // Clear all filters
  clearFilters.addEventListener('click', () => {
    chapterFilter.value = '';
    tagSearch.value = '';
    activeTagsList = [];
    updateActiveTagsDisplay();
    applyFilters();
  });
  
  // Toast notification functions
  const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast-notification');
    const icon = document.getElementById('toast-icon');
    const messageEl = document.getElementById('toast-message');
    
    messageEl.textContent = message;
    toast.className = `toast-notification ${type}`;
    icon.textContent = type === 'success' ? '✓' : '✕';
    
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, type === 'success' ? 2000 : 4000);
  };
});