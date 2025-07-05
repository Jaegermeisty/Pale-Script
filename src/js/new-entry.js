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
  const modeBtns = document.querySelectorAll('.mode-btn');
  const isbnSection = document.getElementById('isbn-section');
  const manualSection = document.getElementById('manual-section');
  const existingSection = document.getElementById('existing-section');
  const isbnInput = document.getElementById('isbn-input');
  const searchBtn = document.getElementById('search-btn');
  const titleInput = document.getElementById('title-input');
  const authorInput = document.getElementById('author-input');
  const existingSearchInput = document.getElementById('existing-search-input');
  const searchResults = document.getElementById('search-results');
  const bookInfo = document.getElementById('book-info');
  const bookCoverPlaceholder = document.getElementById('book-cover-placeholder');
  const bookCoverImage = document.getElementById('book-cover-image');
  const bookTitleDisplay = document.getElementById('book-title-display');
  const bookTitleText = document.getElementById('book-title-text');
  const bookAuthorText = document.getElementById('book-author-text');
  const bookYearText = document.getElementById('book-year-text');
  const entryForm = document.getElementById('entry-form');
  const chapterInput = document.getElementById('chapter-input');
  const tagsInput = document.getElementById('tags-input');
  const tagsDisplay = document.getElementById('tags-display');
  const tagCounter = document.querySelector('.tag-counter');
  const contentInput = document.getElementById('content-input');
  const saveBtn = document.getElementById('save-btn');
  const tooltip = document.getElementById('tooltip');
  
  // State
  let currentMode = 'auto';
  let currentUser = null;
  let currentBookData = null;
  let tags = [];
  
  // Debounce function for search input (define early so it can be used)
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };
  
  // Store input values for each mode to preserve them when switching
  let modeData = {
    auto: {
      isbn: '',
      bookData: null
    },
    manual: {
      title: '',
      author: '',
      bookData: null
    },
    existing: {
      searchTerm: '',
      bookData: null
    }
  };
  
  // Check authentication
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = user;
      hideLoader();
    } else {
      window.location.href = '/src/pages/auth.html';
    }
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
  
  // Back button
  backBtn.addEventListener('click', () => {
    window.location.href = '/src/pages/home.html';
  });
  
  // Mode switching
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      switchMode(mode);
    });
  });
  
  const switchMode = (mode) => {
    if (mode === currentMode) return;
    
    // Save current mode data before switching
    saveCurrentModeData();
    
    currentMode = mode;
    
    // Update button states
    modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Hide all sections first
    isbnSection.style.display = 'none';
    manualSection.style.display = 'none';
    existingSection.style.display = 'none';
    
    // Show the appropriate section and restore data
    if (mode === 'auto') {
      isbnSection.style.display = 'block';
      restoreAutoModeData();
    } else if (mode === 'manual') {
      manualSection.style.display = 'block';
      restoreManualModeData();
    } else if (mode === 'existing') {
      existingSection.style.display = 'block';
      restoreExistingModeData();
    }
  };
  
  const saveCurrentModeData = () => {
    if (currentMode === 'auto') {
      modeData.auto.isbn = isbnInput.value;
      modeData.auto.bookData = currentBookData;
    } else if (currentMode === 'manual') {
      modeData.manual.title = titleInput.value;
      modeData.manual.author = authorInput.value;
      modeData.manual.bookData = currentBookData;
    } else if (currentMode === 'existing') {
      modeData.existing.searchTerm = existingSearchInput.value;
      modeData.existing.bookData = currentBookData;
    }
  };
  
  const restoreAutoModeData = () => {
    isbnInput.value = modeData.auto.isbn;
    if (modeData.auto.bookData) {
      currentBookData = modeData.auto.bookData;
      displayBookInfo(currentBookData);
    } else {
      hideBookInfo();
    }
  };
  
  const restoreManualModeData = () => {
    titleInput.value = modeData.manual.title;
    authorInput.value = modeData.manual.author;
    if (modeData.manual.bookData) {
      currentBookData = modeData.manual.bookData;
      displayBookInfo(currentBookData);
    } else if (modeData.manual.title && modeData.manual.author) {
      // Re-generate manual book info if both fields are filled
      showManualBookInfo();
    } else {
      hideBookInfo();
    }
  };
  
  const restoreExistingModeData = () => {
    existingSearchInput.value = modeData.existing.searchTerm;
    if (modeData.existing.bookData) {
      currentBookData = modeData.existing.bookData;
      displayBookInfo(currentBookData);
    } else {
      hideBookInfo();
      // Clear search results if no book data
      searchResults.style.display = 'none';
    }
  };
  
  const hideBookInfo = () => {
    currentBookData = null;
    bookInfo.style.display = 'none';
    entryForm.style.display = 'none';
  };
  
  // Reset all data (for complete fresh start)
  const resetAllData = () => {
    currentBookData = null;
    bookInfo.style.display = 'none';
    entryForm.style.display = 'none';
    
    // Clear all inputs
    isbnInput.value = '';
    titleInput.value = '';
    authorInput.value = '';
    existingSearchInput.value = '';
    chapterInput.value = '';
    tagsInput.value = '';
    contentInput.value = '';
    tags = [];
    updateTagsDisplay();
    
    // Clear search results
    searchResults.style.display = 'none';
    
    // Clear mode data
    modeData = {
      auto: { isbn: '', bookData: null },
      manual: { title: '', author: '', bookData: null },
      existing: { searchTerm: '', bookData: null }
    };
  };
  
  // ISBN Search
  searchBtn.addEventListener('click', async () => {
    const isbn = isbnInput.value.trim();
    if (!isbn) return;
    
    await searchBookByISBN(isbn);
  });
  
  // Enter key support for ISBN search
  isbnInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });
  
  // Auto-save ISBN input
  isbnInput.addEventListener('input', () => {
    modeData.auto.isbn = isbnInput.value;
    // Clear book data if ISBN is cleared
    if (!isbnInput.value.trim()) {
      modeData.auto.bookData = null;
      hideBookInfo();
    }
  });
  
  // Manual mode - show book info when both fields are filled
  [titleInput, authorInput].forEach(input => {
    input.addEventListener('input', () => {
      // Auto-save manual inputs
      modeData.manual.title = titleInput.value;
      modeData.manual.author = authorInput.value;
      
      if (titleInput.value.trim() && authorInput.value.trim()) {
        showManualBookInfo();
      } else {
        // Clear book data if either field is empty
        modeData.manual.bookData = null;
        hideBookInfo();
      }
    });
  });
  
  // Existing mode - search existing books
  existingSearchInput.addEventListener('input', debounce(async () => {
    const searchTerm = existingSearchInput.value.trim();
    modeData.existing.searchTerm = searchTerm;
    
    if (searchTerm.length > 0) {
      await searchExistingBooks(searchTerm);
    } else {
      searchResults.style.display = 'none';
      modeData.existing.bookData = null;
      hideBookInfo();
    }
  }, 300));
  
  const searchBookByISBN = async (isbn) => {
    setLoading(searchBtn, true);
    
    try {
      // Use the better Books API that returns author names directly
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`);
      
      if (!response.ok) {
        throw new Error('Book not found');
      }
      
      const data = await response.json();
      const bookKey = `ISBN:${isbn}`;
      
      if (!data[bookKey]) {
        throw new Error('Book not found');
      }
      
      const bookData = data[bookKey];
      
      // Extract book details
      const title = bookData.title || 'Unknown Title';
      const authors = bookData.authors ? bookData.authors.map(author => author.name) : ['Unknown Author'];
      const publishYear = bookData.publish_date || 'Unknown';
      const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
      
      currentBookData = {
        isbn: isbn,
        title: title,
        authors: authors,
        publishYear: publishYear,
        coverUrl: coverUrl,
        source: 'api'
      };
      
      // Save to mode data
      modeData.auto.bookData = currentBookData;
      
      displayBookInfo(currentBookData);
      
    } catch (error) {
      console.error('Error fetching book data:', error);
      showError('Book not found. Please try a different ISBN or switch to manual mode.');
    } finally {
      setLoading(searchBtn, false);
    }
  };
  

  
  const showManualBookInfo = () => {
    const title = titleInput.value.trim();
    const author = authorInput.value.trim();
    
    currentBookData = {
      title: title,
      authors: [author],
      publishYear: 'Unknown',
      source: 'manual'
    };
    
    // Save to mode data
    modeData.manual.bookData = currentBookData;
    
    displayBookInfo(currentBookData);
  };
  
  // Search existing books in user's collection
  const searchExistingBooks = async (searchTerm) => {
    try {
      const booksRef = db.collection('users').doc(currentUser.uid).collection('books');
      const snapshot = await booksRef.get();
      
      if (snapshot.empty) {
        searchResults.innerHTML = '<div class="no-results">No books in your collection yet</div>';
        searchResults.style.display = 'block';
        return;
      }
      
      // Filter books by search term
      const matchingBooks = [];
      snapshot.forEach(doc => {
        const book = doc.data();
        const title = book.title.toLowerCase();
        const authors = book.authors.map(a => a.toLowerCase()).join(' ');
        const search = searchTerm.toLowerCase();
        
        if (title.includes(search) || authors.includes(search)) {
          matchingBooks.push({
            id: doc.id,
            ...book
          });
        }
      });
      
      displaySearchResults(matchingBooks);
      
    } catch (error) {
      console.error('Error searching books:', error);
      searchResults.innerHTML = '<div class="error-result">Error searching books</div>';
      searchResults.style.display = 'block';
    }
  };
  
  const displaySearchResults = (books) => {
    if (books.length === 0) {
      searchResults.innerHTML = '<div class="no-results">No matching books found</div>';
    } else {
      searchResults.innerHTML = books.map(book => `
        <div class="search-result-item" data-book-id="${book.id}">
          <div class="result-cover">
            ${book.coverUrl ? 
              `<img src="${book.coverUrl}" alt="${book.title}" />` : 
              `<div class="result-cover-placeholder">${book.title.substring(0, 2).toUpperCase()}</div>`
            }
          </div>
          <div class="result-details">
            <div class="result-title">${book.title}</div>
            <div class="result-author">${book.authors.join(', ')}</div>
            <div class="result-year">${book.publishYear}</div>
          </div>
        </div>
      `).join('');
      
      // Add click handlers for search results
      searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const bookId = item.dataset.bookId;
          const selectedBook = books.find(b => b.id === bookId);
          selectExistingBook(selectedBook);
        });
      });
    }
    
    searchResults.style.display = 'block';
  };
  
  const selectExistingBook = (book) => {
    currentBookData = {
      id: book.id,
      title: book.title,
      authors: book.authors,
      publishYear: book.publishYear,
      coverUrl: book.coverUrl,
      isbn: book.isbn,
      source: book.source
    };
    
    // Save to mode data
    modeData.existing.bookData = currentBookData;
    
    // Hide search results and show book info
    searchResults.style.display = 'none';
    displayBookInfo(currentBookData);
  };
  
  const displayBookInfo = (bookData) => {
    // Update display
    bookTitleDisplay.textContent = bookData.title;
    bookTitleText.textContent = bookData.title;
    bookAuthorText.textContent = bookData.authors.join(', ');
    bookYearText.textContent = bookData.publishYear;
    
    // Handle cover image
    if (bookData.coverUrl) {
      const img = new Image();
      img.onload = () => {
        bookCoverImage.src = bookData.coverUrl;
        bookCoverImage.style.display = 'block';
        bookCoverPlaceholder.style.display = 'none';
      };
      img.onerror = () => {
        // Fallback to placeholder
        bookCoverImage.style.display = 'none';
        bookCoverPlaceholder.style.display = 'flex';
      };
      img.src = bookData.coverUrl;
    } else {
      bookCoverImage.style.display = 'none';
      bookCoverPlaceholder.style.display = 'flex';
    }
    
    // Show sections
    bookInfo.style.display = 'flex';
    entryForm.style.display = 'block';
  };
  
  // Tags functionality
  tagsInput.addEventListener('input', (e) => {
    const value = e.target.value;
    if (value.endsWith(',') || value.endsWith(';')) {
      addTag(value.slice(0, -1).trim());
      e.target.value = '';
    }
  });
  
  tagsInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(e.target.value.trim());
      e.target.value = '';
    }
  });
  
  const addTag = (tagText) => {
    if (!tagText || tags.length >= 20 || tags.includes(tagText)) return;
    
    tags.push(tagText);
    updateTagsDisplay();
  };
  
  const removeTag = (tagText) => {
    tags = tags.filter(tag => tag !== tagText);
    updateTagsDisplay();
  };
  
  const updateTagsDisplay = () => {
    tagCounter.textContent = `${tags.length}/20`;
    
    tagsDisplay.innerHTML = tags.map(tag => `
      <div class="tag">
        <span>${tag}</span>
        <button class="tag-remove" onclick="removeTag('${tag}')" type="button">×</button>
      </div>
    `).join('');
  };
  
  // Make removeTag globally accessible
  window.removeTag = removeTag;
  
  // Save entry
  saveBtn.addEventListener('click', async () => {
    if (!currentBookData || !contentInput.value.trim()) {
      showError('Please fill in all required fields.');
      return;
    }
    
    await saveEntry();
  });
  
  const saveEntry = async () => {
    setLoading(saveBtn, true);
    
    try {
      // Create book identifier
      const bookId = currentBookData.isbn || 
        `manual_${currentBookData.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${currentBookData.authors[0].toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      
      // Get chapter name (default to "General Notes" if empty)
      const chapterName = chapterInput.value.trim() || 'General Notes';
      
      // Create chapter ID from chapter name
      const chapterId = createChapterId(chapterName);
      
      // Check if book already exists
      const bookRef = db.collection('users').doc(currentUser.uid).collection('books').doc(bookId);
      const bookDoc = await bookRef.get();
      
      // Prepare book data
      const bookData = {
        title: currentBookData.title,
        authors: currentBookData.authors,
        publishYear: currentBookData.publishYear,
        coverUrl: currentBookData.coverUrl || null,
        isbn: currentBookData.isbn || null,
        source: currentBookData.source,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // If book doesn't exist, add creation timestamp
      if (!bookDoc.exists) {
        bookData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      }
      
      // Save book data
      await bookRef.set(bookData, { merge: true });
      
      // Check if chapter exists, create if not
      const chapterRef = bookRef.collection('chapters').doc(chapterId);
      const chapterDoc = await chapterRef.get();
      
      if (!chapterDoc.exists) {
        // Get chapter order (count existing chapters + 1)
        const chaptersSnapshot = await bookRef.collection('chapters').get();
        const chapterOrder = chaptersSnapshot.size + 1;
        
        // Create chapter document
        await chapterRef.set({
          id: chapterId,
          name: chapterName,
          order: chapterOrder,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Create entry data
      const entryData = {
        content: contentInput.value.trim(),
        tags: tags,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        userId: currentUser.uid
      };
      
      // Add entry to chapter's entries subcollection
      await chapterRef.collection('entries').add(entryData);
      
      // Update user's book count if this is a new book
      if (!bookDoc.exists) {
        const userRef = db.collection('users').doc(currentUser.uid);
        await userRef.update({
          bookCount: firebase.firestore.FieldValue.increment(1)
        });
      }
      
      // Success - redirect to home
      showSuccess('Entry saved successfully!');
      setTimeout(() => {
        window.location.href = '/src/pages/home.html';
      }, 1500);
      
    } catch (error) {
      console.error('Error saving entry:', error);
      showError('Failed to save entry. Please try again.');
    } finally {
      setLoading(saveBtn, false);
    }
  };
  
  // Helper function to create chapter ID from chapter name
  const createChapterId = (chapterName) => {
    // Convert chapter name to safe ID
    const baseId = chapterName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    // Ensure we have a valid ID
    return baseId || 'general_notes';
  };
  
  // Utility functions
  const setLoading = (element, loading) => {
    if (loading) {
      element.disabled = true;
      element.classList.add('loading');
    } else {
      element.disabled = false;
      element.classList.remove('loading');
    }
  };
  
  const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast-notification');
    const icon = document.getElementById('toast-icon');
    const messageEl = document.getElementById('toast-message');
    
    // Set content
    messageEl.textContent = message;
    
    // Set type and icon
    toast.className = `toast-notification ${type}`;
    icon.textContent = type === 'success' ? '✓' : '✕';
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after delay
    setTimeout(() => {
      toast.classList.remove('show');
    }, type === 'success' ? 2000 : 4000);
  };
  
  const showError = (message) => {
    showToast(message, 'error');
  };
  
  const showSuccess = (message) => {
    showToast(message, 'success');
  };
  
  // Tooltip functionality - Set up after DOM is ready
  const initializeTooltips = () => {
    const tooltipElement = document.getElementById('tooltip');
    const helpIcons = document.querySelectorAll('.help-icon');
    
    if (!tooltipElement || helpIcons.length === 0) {
      return;
    }
    
    helpIcons.forEach(icon => {
      icon.addEventListener('mouseenter', (e) => {
        const tooltipText = e.currentTarget.dataset.tooltip;
        if (tooltipText) {
          showTooltip(e.currentTarget, tooltipText, tooltipElement);
        }
      });
      
      icon.addEventListener('mouseleave', () => {
        hideTooltip(tooltipElement);
      });
    });
  };
  
  const showTooltip = (element, text, tooltipElement) => {
    tooltipElement.textContent = text;
    tooltipElement.style.display = 'block';
    tooltipElement.style.opacity = '1';
    tooltipElement.style.pointerEvents = 'none';
    
    // Get element position
    const rect = element.getBoundingClientRect();
    
    // Position tooltip
    const tooltipLeft = rect.left + (rect.width / 2);
    const tooltipTop = rect.bottom + 8;
    
    tooltipElement.style.position = 'fixed';
    tooltipElement.style.left = `${tooltipLeft}px`;
    tooltipElement.style.top = `${tooltipTop}px`;
    tooltipElement.style.transform = 'translateX(-50%)';
    tooltipElement.style.zIndex = '9999';
  };
  
  const hideTooltip = (tooltipElement) => {
    tooltipElement.style.opacity = '0';
    setTimeout(() => {
      tooltipElement.style.display = 'none';
    }, 300);
  };
  
  // Initialize tooltips after everything is set up
  setTimeout(initializeTooltips, 100);
});