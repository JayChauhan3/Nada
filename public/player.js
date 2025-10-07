// Player functionality
document.addEventListener('DOMContentLoaded', function() {
  const player = document.querySelector('.nada-player');
  const maximizeBtn = document.createElement('button');
  const playPauseBtn = document.createElement('button');
  
  // Create maximize button for desktop
  maximizeBtn.className = 'maximize-btn';
  maximizeBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
    </svg>
  `;
  
  // Create play/pause button for mobile/tablet
  playPauseBtn.className = 'mobile-play-pause';
  playPauseBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  `;
  
  // Add buttons to the DOM
  player.appendChild(maximizeBtn);
  player.appendChild(playPauseBtn);
  
  // Set up event listeners for the main play button changes
  function setupPlayButtonObserver() {
    const playBtn = document.getElementById('play');
    if (!playBtn) return;
    
    // Create a MutationObserver to watch for src changes on the play button
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
          updatePlayPauseIcon();
        }
      });
    });
    
    // Start observing the play button for attribute changes
    observer.observe(playBtn, { attributes: true });
    
    // Also listen to click events as a fallback
    playBtn.addEventListener('click', updatePlayPauseIcon);
    
    // Initial update
    updatePlayPauseIcon();
  }
  
  // Set up the observer when the DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPlayButtonObserver);
  } else {
    setupPlayButtonObserver();
  }
  
  // Initial update of play/pause icon
  updatePlayPauseIcon();
  
  // Track touch start position for swipe gesture
  let touchStartY = 0;
  let isSwiping = false;
  
  // Toggle mobile overlay
  function toggleMobileOverlay() {
    // Don't show overlay on desktop
    if (window.innerWidth >= 1280) return;
    
    const overlay = document.querySelector('.mobile-player-overlay');
    if (!overlay) return;
    
    if (overlay.classList.contains('active')) {
      closeMobileOverlay();
    } else {
      openMobileOverlay();
    }
  }
  
  // Close mobile overlay
  function closeMobileOverlay() {
    const overlay = document.querySelector('.mobile-player-overlay');
    if (!overlay || !overlay.classList.contains('active')) return;
    
      // Clean up event listeners and observers
    if (typeof overlay._cleanupTouchEvents === 'function') {
      overlay._cleanupTouchEvents();
    }
    if (typeof overlay._cleanupPopState === 'function') {
      overlay._cleanupPopState();
    }
    if (overlay._pollInterval) {
      clearInterval(overlay._pollInterval);
      delete overlay._pollInterval;
    }
    if (overlay._playObserver) {
      overlay._playObserver.disconnect();
      delete overlay._playObserver;
    }
    if (overlay._trackObserver) {
      overlay._trackObserver.disconnect();
      delete overlay._trackObserver;
    }
    if (overlay._coverObserver) {
      overlay._coverObserver.disconnect();
      delete overlay._coverObserver;
    }
    
    // Clean up audio event listeners
    if (overlay._audioElement) {
      const audio = overlay._audioElement;
      audio.removeEventListener('timeupdate', updateProgressBar);
      audio.removeEventListener('play', updateOverlayContent);
      audio.removeEventListener('pause', updateOverlayContent);
      audio.removeEventListener('ended', updateOverlayContent);
      delete overlay._audioElement;
    }
    
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    
    // Stop progress updates when overlay is closed
    stopProgressUpdates();
    
    // Remove from browser history if we're the ones who added it
    if (window.history && history.state && history.state.overlay) {
      history.back();
    }
  }
  
    // Create a custom event for song changes
  const songChangeEvent = new Event('songChanged');
  
  // Function to force update overlay content
  function updateOverlayContent() {
    const overlay = document.querySelector('.mobile-player-overlay');
    if (!overlay) return;
    
    // Get the main player elements
    const mainTitle = document.querySelector('.track-text h4');
    const mainArtist = document.querySelector('.track-text p');
    const mainCover = document.querySelector('.cover');
    const mainPlayBtn = document.getElementById('play');
    
    // Get overlay elements
    const overlayTitle = overlay.querySelector('.overlay-track-title');
    const overlayArtist = overlay.querySelector('.overlay-track-artist');
    const overlayCover = overlay.querySelector('.overlay-cover');
    const overlayPlayBtn = overlay.querySelector('#overlay-play img');
    
    // Update title if changed
    if (mainTitle && overlayTitle) {
      const newTitle = mainTitle.textContent || 'Unknown Track';
      if (overlayTitle.textContent !== newTitle) {
        overlayTitle.textContent = newTitle;
      }
    }
    
    // Update artist if changed
    if (mainArtist && overlayArtist) {
      const newArtist = mainArtist.textContent || 'Unknown Artist';
      if (overlayArtist.textContent !== newArtist) {
        overlayArtist.textContent = newArtist;
      }
    }
    
    // Update cover if changed - handle both data URLs and regular URLs
    if (mainCover && overlayCover) {
      const mainCoverSrc = mainCover.src || '';
      // If it's a data URL, use it directly, otherwise add timestamp to prevent caching
      if (mainCoverSrc) {
        if (mainCoverSrc.startsWith('data:') || mainCoverSrc.startsWith('blob:')) {
          if (overlayCover.src !== mainCoverSrc) {
            overlayCover.src = mainCoverSrc;
          }
        } else if (overlayCover.src !== mainCoverSrc) {
          // For regular URLs, add timestamp to prevent caching
          overlayCover.src = mainCoverSrc + (mainCoverSrc.includes('?') ? '&' : '?') + 't=' + Date.now();
        }
      }
    }
    
    // Update play/pause button
    if (mainPlayBtn && overlayPlayBtn) {
      const isPlaying = mainPlayBtn.src && (mainPlayBtn.src.includes('pause.svg') || mainPlayBtn.src.includes('pause'));
      const newSrc = isPlaying ? './images/pause.svg' : './images/pcontrol.svg';
      const newAlt = isPlaying ? 'Pause' : 'Play';
      
      if (!overlayPlayBtn.src || !overlayPlayBtn.src.includes(isPlaying ? 'pause' : 'pcontrol')) {
        overlayPlayBtn.src = newSrc;
        overlayPlayBtn.alt = newAlt;
      }
    }
    
    // Update progress bar
    updateProgressBar();
    
    // Force a reflow to ensure the UI updates
    void overlay.offsetHeight;
  }
  
  // Open mobile overlay
  function openMobileOverlay() {
    // Don't show overlay on desktop
    if (window.innerWidth >= 1280) return;
    
    const overlay = document.querySelector('.mobile-player-overlay');
    if (!overlay) return;
    
    // Get the main player's buttons
    const mainPrevBtn = document.getElementById('previous');
    const mainNextBtn = document.getElementById('next');
    const mainPlayBtn = document.getElementById('play');
    
    // Get overlay control buttons
    const overlayPrevBtn = document.getElementById('overlay-previous');
    const overlayNextBtn = document.getElementById('overlay-next');
    const overlayPlayBtn = document.getElementById('overlay-play');
    
    // Add click handlers for overlay controls
    if (overlayPrevBtn && mainPrevBtn) {
      overlayPrevBtn.onclick = () => {
        mainPrevBtn.click();
        // Force update after a short delay
        setTimeout(updateOverlayContent, 50);
      };
    }
    
    if (overlayNextBtn && mainNextBtn) {
      overlayNextBtn.onclick = () => {
        mainNextBtn.click();
        // Force update after a short delay
        setTimeout(updateOverlayContent, 50);
      };
    }
    
    if (overlayPlayBtn && mainPlayBtn) {
      overlayPlayBtn.onclick = () => {
        mainPlayBtn.click();
        // Update play/pause button immediately
        const isPlaying = mainPlayBtn.src.includes('pause.svg');
        overlayPlayBtn.innerHTML = isPlaying ? 
          '<img src="./images/pause.svg" alt="Pause">' : 
          '<img src="./images/pcontrol.svg" alt="Play">';
      };
    }
    
    // Initial update
    updateOverlayContent();
    
    // Set up polling as a fallback (less frequent since we have observers)
    const pollInterval = setInterval(updateOverlayContent, 500);
    
    // Store interval for cleanup
    overlay._pollInterval = pollInterval;
    
    // Observe the play button for state changes
    const playBtn = document.getElementById('play');
    if (playBtn) {
      const playObserver = new MutationObserver(updateOverlayContent);
      playObserver.observe(playBtn, { 
        attributes: true,
        attributeFilter: ['src']
      });
      
      overlay._playObserver = playObserver;
    }
    
    // Observe track info changes
    const trackText = document.querySelector('.track-text');
    if (trackText && !overlay._trackObserver) {
      const trackObserver = new MutationObserver(updateOverlayContent);
      trackObserver.observe(trackText, { 
        childList: true, 
        subtree: true,
        characterData: true
      });
      
      overlay._trackObserver = trackObserver;
    }
    
    // Observe cover image changes
    const cover = document.querySelector('.cover');
    if (cover && !overlay._coverObserver) {
      const coverObserver = new MutationObserver(updateOverlayContent);
      coverObserver.observe(cover, { 
        attributes: true,
        attributeFilter: ['src']
      });
      
      overlay._coverObserver = coverObserver;
    }
    
    // Show the overlay
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Add to browser history for back button support
    if (history.pushState) {
      history.pushState({ overlay: true }, '');
    }
    
    // Add touch event listeners for swipe down
    let startY = 0;
    let isSwiping = false;
    const SWIPE_THRESHOLD = 50; // pixels to swipe before closing
    
    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
      isSwiping = false;
    };
    
    const handleTouchMove = (e) => {
      if (!startY) return;
      
      const y = e.touches[0].clientY;
      const diff = y - startY;
      
      // Only consider it a swipe if we're moving down
      if (diff > 10) {
        e.preventDefault();
        isSwiping = true;
        
        // Add a class to show visual feedback
        overlay.classList.add('swiping-down');
        
        // If swiping down more than threshold, close the overlay
        if (diff > SWIPE_THRESHOLD) {
          closeMobileOverlay();
          return;
        }
      }
    };
    
    const handleTouchEnd = (e) => {
      if (isSwiping) {
        // Remove swiping class and close if threshold was reached
        overlay.classList.remove('swiping-down');
        closeMobileOverlay();
      }
      startY = 0;
      isSwiping = false;
    };
    
    // Add event listeners
    overlay.addEventListener('touchstart', handleTouchStart, { passive: true });
    overlay.addEventListener('touchmove', handleTouchMove, { passive: false });
    overlay.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // Store the cleanup function to remove event listeners
    overlay._cleanupTouchEvents = () => {
      overlay.removeEventListener('touchstart', handleTouchStart, { passive: true });
      overlay.removeEventListener('touchmove', handleTouchMove, { passive: false });
      overlay.removeEventListener('touchend', handleTouchEnd, { passive: true });
      overlay.classList.remove('swiping-down');
      delete overlay._cleanupTouchEvents;
    };
    
    // Handle back button
    const handlePopState = (event) => {
      if (overlay.classList.contains('active')) {
        closeMobileOverlay();
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Store the cleanup function to remove popstate listener
    overlay._cleanupPopState = () => {
      window.removeEventListener('popstate', handlePopState);
      delete overlay._cleanupPopState;
    };
    
    // Start progress updates
    startProgressUpdates();
    
    // Set up click handler for progress bar - match main player's behavior
    const progressBar = overlay.querySelector('.overlay-progress-bar');
    if (progressBar) {
      progressBar.onclick = function(e) {
        const audio = window.currentSong || document.querySelector('audio');
        if (!audio || !audio.duration) return;
        
        const rect = this.getBoundingClientRect();
        const clickPosition = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const clickRatio = clickPosition / rect.width;
        
        // Update the current time based on click position
        audio.currentTime = audio.duration * clickRatio;
        
        // Force update the UI immediately
        if (audio === window.currentSong && window.updateProgressBar) {
          // If using the main player's audio, use its update function
          window.updateProgressBar();
        } else {
          // Otherwise use our local update
          updateProgressBar();
        }
      };
    }
    
    // Update play/pause button to match main player
    const mainPlayButton = document.getElementById('play');
    const overlayPlayButton = document.getElementById('overlay-play');
    if (mainPlayButton && overlayPlayButton) {
      const isPlaying = mainPlayButton.getAttribute('src').includes('pause.svg');
      overlayPlayButton.innerHTML = isPlaying ? 
        '<img src="./images/pause.svg" alt="Pause">' : 
        '<img src="./images/pcontrol.svg" alt="Play">';
      
      // Use the same click handler as the main play button
      overlayPlayButton.onclick = function(e) {
        e.stopPropagation();
        mainPlayButton.click();
        updatePlayPauseIcons();
      };
    }
  }
  
  // Update progress bar in overlay and main player
  function updateProgressBar() {
    // Use the main audio element from 1.js if available, otherwise fall back to querySelector
    const audio = window.currentSong || document.querySelector('audio');
    if (!audio || !audio.duration || isNaN(audio.duration) || !isFinite(audio.duration)) {
      // Set progress to 0% if audio is not ready
      const overlayProgress = document.querySelector('.overlay-progress');
      if (overlayProgress) overlayProgress.style.width = '0%';
      return;
    }
    
    // Ensure currentTime doesn't exceed duration
    const currentTime = Math.min(audio.currentTime, audio.duration);
    const progress = (currentTime / audio.duration) * 100;
    
    // Update overlay progress bar
    const overlayProgressBar = document.querySelector('.overlay-progress');
    if (overlayProgressBar) {
      overlayProgressBar.style.width = `${progress}%`;
    }
    
    // Update time displays
    const overlayCurrentTime = document.querySelector('.overlay-current-time');
    const overlayTotalTime = document.querySelector('.overlay-total-time');
    
    if (overlayCurrentTime) {
      overlayCurrentTime.textContent = formatTime(currentTime);
    }
    if (overlayTotalTime) {
      overlayTotalTime.textContent = formatTime(audio.duration);
    }
    
    // Force a reflow to ensure the progress bar updates
    if (overlayProgressBar) {
      overlayProgressBar.style.display = 'none';
      overlayProgressBar.offsetHeight; // Trigger reflow
      overlayProgressBar.style.display = '';
    }
  }
  
  // Set up progress bar update interval
  let progressInterval;
  
  function startProgressUpdates() {
    // Clear any existing interval
    if (progressInterval) clearInterval(progressInterval);
    
    // Initial update
    updateProgressBar();
    
    // Set up timeupdate event listener for smoother updates
    const audio = window.currentSong || document.querySelector('audio');
    if (audio) {
      // Remove any existing listener to prevent duplicates
      audio.removeEventListener('timeupdate', updateProgressBar);
      audio.addEventListener('timeupdate', updateProgressBar);
      
      // Also listen for duration changes
      audio.addEventListener('durationchange', updateProgressBar);
      audio.addEventListener('loadedmetadata', updateProgressBar);
    }
    
    // Fallback interval in case timeupdate doesn't fire consistently
    progressInterval = setInterval(updateProgressBar, 100);
  }
  
  function stopProgressUpdates() {
    // Remove event listeners
    const audio = window.currentSong || document.querySelector('audio');
    if (audio) {
      audio.removeEventListener('timeupdate', updateProgressBar);
      audio.removeEventListener('durationchange', updateProgressBar);
      audio.removeEventListener('loadedmetadata', updateProgressBar);
    }
    
    // Clear the interval
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }
  
  // Format time in MM:SS format
  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }
  
  // Toggle overlay with poster
  function toggleExpanded() {
    // Don't show desktop overlay on mobile
    if (window.innerWidth < 1280) return;
    
    let overlay = document.querySelector('.nada-overlay');
    
    if (!overlay) {
      // Create overlay
      overlay = document.createElement('div');
      overlay.className = 'nada-overlay';
      
      // Get player position
      const playerRect = player.getBoundingClientRect();
      
      // Style overlay to cover everything except player with blur effect
      Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: `${window.innerHeight - playerRect.top}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Semi-transparent dark overlay
        backdropFilter: 'blur(10px)', // Blur effect
        WebkitBackdropFilter: 'blur(10px)', // For Safari
        zIndex: '9999', // Ensure it's above everything including navbar
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      });
      
      // Add cover to overlay
      const cover = player.querySelector('.cover');
      if (cover) {
        const coverContainer = document.createElement('div');
        coverContainer.style.position = 'relative';
        coverContainer.style.width = '70vmin';  // Reduced from 80vmin
        coverContainer.style.height = '70vmin'; // Reduced from 80vmin
        coverContainer.style.maxWidth = '500px'; // Reduced from 600px
        coverContainer.style.maxHeight = '500px'; // Reduced from 600px
        coverContainer.style.margin = '0 auto';
        coverContainer.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.3), 0 6px 12px rgba(0, 0, 0, 0.25)';
        coverContainer.style.borderRadius = '8px';
        
        const coverClone = cover.cloneNode(true);
        Object.assign(coverClone.style, {
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '100%',
          maxHeight: '100%',
          borderRadius: '18px' // Slightly smaller radius than container
        });
        
        coverContainer.appendChild(coverClone);
        overlay.appendChild(coverContainer);
      }
      
      document.body.appendChild(overlay);
      
      // Change icon to minimize (four arrows pointing inward)
      const icon = maximizeBtn.querySelector('path');
      if (icon) {
        icon.setAttribute('d', 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z');
      }
    } else {
      // Remove overlay and reset icon to maximize (single square)
      overlay.remove();
      const icon = maximizeBtn.querySelector('path');
      if (icon) {
        icon.setAttribute('d', 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z');
      }
    }
  }
  
  // Update play/pause button icon based on audio state
  function updatePlayPauseIcon() {
    updatePlayPauseIcons();
  }

  // Toggle play/pause and sync with main player
  function togglePlayPause(e) {
    if (e) e.stopPropagation();
    
    // Get the main play button and trigger its click
    const mainPlayButton = document.getElementById('play');
    if (mainPlayButton) {
      mainPlayButton.click();
      updatePlayPauseIcons();
    }
  }
  
  // Update all play/pause icons to match current state
  function updatePlayPauseIcons() {
    const mainPlayButton = document.getElementById('play');
    if (!mainPlayButton) return;
    
    const isPlaying = mainPlayButton.getAttribute('src').includes('pause.svg');
    const playPauseIcon = playPauseBtn.querySelector('path');
    const overlayPlayBtn = document.getElementById('overlay-play');
    
    if (isPlaying) {
      if (playPauseIcon) playPauseIcon.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
      if (overlayPlayBtn) overlayPlayBtn.innerHTML = '<img src="./images/pause.svg" alt="Pause">';
    } else {
      if (playPauseIcon) playPauseIcon.setAttribute('d', 'M8 5v14l11-7z');
      if (overlayPlayBtn) overlayPlayBtn.innerHTML = '<img src="./images/pcontrol.svg" alt="Play">';
    }
  }
  
  // Handle touch start for swipe gesture
  function handleTouchStart(e) {
    const overlay = document.querySelector('.mobile-player-overlay');
    if (!overlay || !overlay.classList.contains('active')) return;
    
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
    overlay.style.transition = 'none';
  }
  
  // Handle touch move for swipe gesture
  function handleTouchMove(e) {
    if (!isSwiping) return;
    
    const overlay = document.querySelector('.mobile-player-overlay');
    if (!overlay || !overlay.classList.contains('active')) return;
    
    touchEndY = e.touches[0].clientY;
    const diff = touchEndY - touchStartY;
    
    // Only allow swipe down
    if (diff > 0) {
      e.preventDefault();
      const translateY = Math.min(diff, 200);
      overlay.style.transform = `translateY(${translateY}px)`;
      overlay.style.opacity = 1 - (translateY / 400);
    }
  }
  
  // Handle touch end for swipe gesture
  function handleTouchEnd() {
    const overlay = document.querySelector('.mobile-player-overlay');
    if (!overlay || !overlay.classList.contains('active')) return;
    
    overlay.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    
    // If swiped down more than 100px, close the overlay
    if (touchEndY - touchStartY > 100) {
      overlay.style.transform = 'translateY(100%)';
      overlay.style.opacity = '0';
      
      setTimeout(() => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        overlay.style.transform = '';
        overlay.style.opacity = '';
      }, 300);
    } else {
      // Reset position if not swiped enough
      overlay.style.transform = '';
      overlay.style.opacity = '';
    }
    
    isSwiping = false;
  }
  
  // Event listeners
  // Only handle clicks on the maximize button for desktop overlay (screens >= 1280px)
  maximizeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (window.innerWidth >= 1279) {
      toggleExpanded();
    }
  });

  // Handle mobile overlay toggle when clicking on the player
  player.addEventListener('click', function(e) {
    // Only open overlay on mobile and not when clicking on controls
    if (window.innerWidth < 1280 && 
        !e.target.closest('.mobile-play-pause') && 
        !e.target.closest('.player-controls') &&
        !e.target.closest('.volume-controls')) {
      e.preventDefault();
      e.stopPropagation();
      toggleMobileOverlay();
    }
  });
  
  // Close fullscreen if somehow active on desktop
  if (window.innerWidth >= 1280 && player.classList.contains('fullscreen')) {
    player.classList.remove('fullscreen');
    player.style.transform = '';
    player.style.opacity = '';
    player.style.transition = '';
  }
  
  playPauseBtn.addEventListener('click', togglePlayPause);
  // Touch events for swipe down to close
  player.addEventListener('touchstart', handleTouchStart, { passive: false });
  player.addEventListener('touchmove', handleTouchMove, { passive: false });
  player.addEventListener('touchend', handleTouchEnd);
  
  // Close overlay when screen is resized below 1280px
  window.addEventListener('resize', function() {
    if (window.innerWidth < 1280) {
      const overlay = document.querySelector('.nada-overlay');
      if (overlay) {
        overlay.remove();
        const icon = maximizeBtn.querySelector('path');
        if (icon) {
          icon.setAttribute('d', 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z');
        }
      }
    }
  });

  // Close fullscreen when pressing back button on mobile
  window.addEventListener('popstate', function() {
    if (window.innerWidth <= 768 && player.classList.contains('fullscreen')) {
      player.classList.remove('fullscreen');
      document.body.style.overflow = '';
    }
  });
  
  // Handle window resize
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      player.classList.remove('fullscreen');
      document.body.style.overflow = '';
    }
    
    // Reset transform on resize
    player.style.transform = '';
    player.style.opacity = '';
  });
  
  // Listen to play/pause events to update the mobile play/pause button
  document.addEventListener('play', function(e) {
    if (e.target.id === 'play') {
      playPauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      `;
    }
  });
  
  document.addEventListener('pause', function(e) {
    if (e.target.id === 'play') {
      playPauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
    }
  });
});
