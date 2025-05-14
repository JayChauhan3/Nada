// --- Searchbar functionality: handles showing/hiding the clear button and clearing the input ---
const searchInput = document.getElementById('searchInput'); // Get reference to the search input box
const clearButton = document.getElementById('clearButton'); // Get reference to the clear ('x') button

searchInput.addEventListener('input', () => { // When user types in the search box...
  clearButton.style.display = searchInput.value.length > 0 ? 'block' : 'none'; // Show clear button if there's text
});

clearButton.addEventListener('click', () => { // When user clicks the clear button...
  searchInput.value = ''; // Clear the search box
  clearButton.style.display = 'none'; // Hide the clear button
  searchInput.focus(); // Focus back on the search box
});

// --- Header button toggle: visually marks which nav button is active ---
const buttons = document.querySelectorAll('.hbtn'); // Get all header buttons
buttons.forEach(btn => {
  btn.addEventListener('click', () => { // On click...
    buttons.forEach(b => b.classList.remove('active')); // Remove 'active' from all
    btn.classList.add('active'); // Set 'active' on the clicked one
  });
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// --- Audio player state and global variables ---
let currentSong = new Audio(); // Audio object for playback
const play = document.getElementById('play'); // Play/pause button in the UI
let isSongLoaded = false; // Tracks if a song's metadata is loaded
let currFolder; // Current folder (playlist) being played
let songs = []; // List of songs in the current folder
let currentSongIndex = 0; // Index of the currently playing song

// --- Volume state ---
let isMuted = false; // Whether the player is muted
let lastVolume = 1; // Last non-zero volume, for restoring after mute

// --- Helper: Converts seconds to mm:ss format for display ---
function secondstominute(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// --- Fetches and renders the song list for a folder (playlist) ---
async function getSongs(folder) {
  currentSongIndex = 0;
  currFolder = folder;
  let a = await fetch(`http://127.0.0.1:3000/video%2084/${currFolder}/`); // Fetch folder listing from server
  let response = await a.text();

  let div = document.createElement('div');
  div.innerHTML = response;
  let as = div.getElementsByTagName('a');
  songs = [];

  // Loop through all links and add .mp3 files to the songs array
  for (let index = 0; index < as.length; index++) {
    const element = as[index];
    if (element.href.endsWith(".mp3")) {
      songs.push(decodeURIComponent(element.href.split("/").pop()));
    }
  }

  // --- Render song list in the sidebar/library ---
  let songul = document.querySelector('.library').getElementsByTagName("ul")[0];
  songul.innerHTML = ""
  for (const song of songs) {
    let name = decodeURIComponent(song.split("/").pop());
    let trackName = name.replace(/\.mp3$/i, '');

    const li = document.createElement('li');
    li.setAttribute('data-src', name);

    // Song list item structure: poster, play button, title, artist
    li.innerHTML = `
     <div class="s1">
       <img class="li-poster" src="../images/likedsongs.png" alt="${trackName}">
       <button><img class="Click-play" src="../images/p.svg" alt="Play"></button>
     </div>
     <span>
       <p class="stitle">${trackName}</p>
       <p class="artist">Loading...</p>
     </span>
   `;

    songul.appendChild(li);

    // --- Fetch song tags (artist, cover) asynchronously ---
    const songUrl = `http://127.0.0.1:3000/video%2084/${currFolder}/${encodeURIComponent(name)}`;
    fetch(songUrl)
      .then(res => res.blob())
      .then(blob => {
        jsmediatags.read(blob, {
          onSuccess: function (tag) {
            const artist = tag.tags.artist || 'Unknown Artist';
            li.querySelector('.artist').textContent = artist;

            const picture = tag.tags.picture;
            if (picture) {
              let base64String = "";
              for (let i = 0; i < picture.data.length; i++) {
                base64String += String.fromCharCode(picture.data[i]);
              }
              const imageUri = `data:${picture.format};base64,${btoa(base64String)}`;
              li.querySelector('.li-poster').src = imageUri;
            }
          },
          onError: function () {
            li.querySelector('.artist').textContent = 'Unknown Artist';
          }
        });
      });

    // --- Song click: play the song from the list ---
    li.addEventListener("click", () => {
      const actualFile = li.getAttribute("data-src");
      playMusic(actualFile, {fromList: true, autoPlay: true}); // Always play from start and update state
    });
  }
  return songs;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// --- Core function: loads and plays a song, updates UI and state ---
function playMusic(track, options = {}) {
  // options: {fromList: bool, resumeTime: float, autoPlay: bool}
  const playBtn = document.getElementById('play');
  const songUrl = `http://127.0.0.1:3000/video%2084/${currFolder}/` + encodeURIComponent(track);
  currentSong.src = songUrl;
  isSongLoaded = false;
  currentSongIndex = songs.findIndex(s => decodeURIComponent(s) === decodeURIComponent(track));
  document.querySelector('.track-text').firstElementChild.innerHTML = track.replace(/\.mp3$/i, '');
  readTagsFromUrl(songUrl, '.cover', '.track-text p');
  localStorage.setItem('lastPlayedSong', track);
  localStorage.setItem('lastPlayedFolder', currFolder);
  localStorage.setItem('lastPlayedIndex', currentSongIndex);

  // --- When audio metadata is loaded, update UI and possibly play ---
  currentSong.onloadedmetadata = () => {
    isSongLoaded = true;
    let resumeTime = options.resumeTime || 0;
    if (options.fromList) resumeTime = 0;
    if (resumeTime > 0 && resumeTime < currentSong.duration) {
      currentSong.currentTime = resumeTime;
    } else {
      currentSong.currentTime = 0;
    }
    document.querySelector('.current-time').innerHTML = secondstominute(currentSong.currentTime);
    document.querySelector('.total-time').innerHTML = secondstominute(currentSong.duration);
    updateProgressBar();
    if (options.autoPlay !== false) {
      currentSong.play().then(() => {
        playBtn.src = '../images/pause.svg';
        localStorage.setItem('wasPlaying', 'true');
      }).catch(() => {
        playBtn.src = '../images/pcontrol.svg';
        localStorage.setItem('wasPlaying', 'false');
      });
    } else {
      playBtn.src = '../images/pcontrol.svg';
      localStorage.setItem('wasPlaying', 'false');
    }
  };
}

// --- Reads ID3 tags (artist, cover) from a song file and updates the UI ---
async function readTagsFromUrl(songUrl, coverSelector, artistSelector) {
  try {
    const response = await fetch(songUrl);
    const blob = await response.blob();
    jsmediatags.read(blob, {
      onSuccess: function (tag) {
        const artist = tag.tags.artist || 'Unknown Artist';
        if (artistSelector) document.querySelector(artistSelector).textContent = artist;

        const picture = tag.tags.picture;
        if (picture) {
          let base64String = "";
          for (let i = 0; i < picture.data.length; i++) {
            base64String += String.fromCharCode(picture.data[i]);
          }
          const imageUri = `data:${picture.format};base64,${btoa(base64String)}`;
          if (coverSelector) document.querySelector(coverSelector).src = imageUri;
        } else {
          if (coverSelector) document.querySelector(coverSelector).src = "../images/likedsongs.png";
        }
      },
      onError: function () {
        if (artistSelector) document.querySelector(artistSelector).textContent = 'Unknown Artist';
        if (coverSelector) document.querySelector(coverSelector).src = "../images/likedsongs.png";
      }
    });
  } catch (err) {
    console.error("Failed to read tags:", err);
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// --- Loads and renders album cards (playlists) on the main page ---
async function displayAlbum() {
  let a = await fetch(`http://127.0.0.1:3000/video%2084/songs/`);
  let response = await a.text();
  let div = document.createElement('div');
  div.innerHTML = response;
  let anchors = div.getElementsByTagName("a")
  let cardscontent = document.querySelector(".cardscontent")
  let array = Array.from(anchors)
  for (let index = 0; index < array.length; index++) {
    const e = array[index];

    if (e.href.includes("/songs/") &&
      !e.href.endsWith("/songs/") &&
      !e.href.includes(".DS_Store")) {
      let folder = e.href.split('/').filter(part => part).pop();

      //get metadata of folder (title, description)
      let a = await fetch(`http://127.0.0.1:3000/video%2084/songs/${folder}/info.json`);
      let response = await a.json();

      cardscontent.innerHTML = cardscontent.innerHTML + ` <div data-folder="${folder}" class="card">
            <div class="img-wrapper"><img src="${e.href}cover.jpg" class="poster" width="100%">
              <button class="play-button">
                <img src="../images/play.svg" alt="Play" width="24" height="24" />
              </button>
            </div>
            <span>${response.title}</span>
            <p>${response.description}</p>
          </div>`
    }
  }
  // --- Album card click: loads the playlist and plays the first song ---
  Array.from(document.querySelectorAll('.card')).forEach(e => {
    e.addEventListener('click', async item => {
      const folder = `songs/${item.currentTarget.dataset.folder}`;
      currFolder = folder;
      songs = await getSongs(folder);
      playMusic(songs[0], {fromList: true, autoPlay: true});
      localStorage.setItem('lastPlayedFolder', folder);
      localStorage.setItem('lastPlayedIndex', 0);
      localStorage.setItem('lastPlayedTime', 0);
      localStorage.setItem('wasPlaying', 'true');
    });
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// --- Updates the volume bar and icon based on current volume ---
function updateVolumeUI(volume) {
  const volumeInput = document.querySelector('.volume');
  const volumeIcon = document.querySelector('.volume-icon');
  if (!volumeInput || !volumeIcon) return;

  const percent = volume * 100;
  volumeInput.style.background = `linear-gradient(to right, #1db954 ${percent}%, #535353 ${percent}%)`;

  if (volume === 0) {
    volumeIcon.src = '../images/muted.svg';
  } else if (volume < 0.5) {
    volumeIcon.src = '../images/low.svg';
  } else {
    volumeIcon.src = '../images/volume.svg';
  }
}

// --- Restores volume from localStorage and updates UI on page load ---
function restoreVolume() {
  const volumeInput = document.querySelector('.volume');
  let savedVolume = parseFloat(localStorage.getItem('lastVolume'));
  if (isNaN(savedVolume)) savedVolume = 1;
  currentSong.volume = savedVolume;
  if (volumeInput) volumeInput.value = savedVolume * 100;
  updateVolumeUI(savedVolume);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// --- Main function: initializes the player and restores state ---
async function main() {
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const volumeInput = document.querySelector('.volume');
  const volumeIcon = document.querySelector('.volume-icon');
  const bar = document.querySelector('.bar');

  // --- Robust restore on refresh ---
  const lastPlayed = localStorage.getItem('lastPlayedSong');
  const lastTime = parseFloat(localStorage.getItem('lastPlayedTime')) || 0;
  const wasPlaying = localStorage.getItem('wasPlaying') === 'true';
  const lastFolder = localStorage.getItem('lastPlayedFolder') || "songs/liked";

  // Always load the correct folder and songs before resuming
  currFolder = lastFolder;
  songs = await getSongs(currFolder);

  let trackToShow = songs[0];
  let indexToShow = 0;

  if (lastPlayed && songs.includes(lastPlayed)) {
    trackToShow = lastPlayed;
    indexToShow = songs.indexOf(lastPlayed);
  }

  currentSongIndex = indexToShow;

  // Set up the audio source and restore position/state
  playMusic(trackToShow, {resumeTime: lastTime, autoPlay: wasPlaying});

  //Display Album on the right page
  displayAlbum();

  // Restore volume
  restoreVolume();

  // --- Play/Pause button logic ---
  play.addEventListener("click", () => {
    if (!isSongLoaded) return;
    if (currentSong.paused) {
      currentSong.play();
      play.src = '../images/pause.svg';
      localStorage.setItem('wasPlaying', 'true');
    } else {
      currentSong.pause();
      play.src = '../images/pcontrol.svg';
      localStorage.setItem('wasPlaying', 'false');
    }
  });

  // --- Volume controls: slider ---
  volumeInput.addEventListener('input', (e) => {
    const newVolume = parseInt(e.target.value) / 100;
    currentSong.volume = newVolume;
    if (newVolume > 0) {
      lastVolume = newVolume;
      isMuted = false;
    }
    updateVolumeUI(newVolume);
    localStorage.setItem('lastVolume', newVolume);
  });

  // --- Volume controls: mute/unmute icon ---
  volumeIcon.addEventListener('click', () => {
    if (isMuted || currentSong.volume === 0) {
      currentSong.volume = lastVolume;
      volumeInput.value = lastVolume * 100;
      isMuted = false;
    } else {
      lastVolume = currentSong.volume;
      currentSong.volume = 0;
      volumeInput.value = 0;
      isMuted = true;
    }
    updateVolumeUI(currentSong.volume);
    localStorage.setItem('lastVolume', currentSong.volume);
  });

  // --- Progress bar update function ---
  function updateProgressBar() {
    const progress = document.querySelector('.progress');
    if (!currentSong.duration) {
      progress.style.width = '0%';
      return;
    }
    const percentage = (currentSong.currentTime / currentSong.duration) * 100;
    progress.style.width = `${percentage}%`;
  }

  // --- Seek in song by clicking on the progress bar ---
  bar.addEventListener('click', (e) => {
    const bar = e.currentTarget;
    const clickPosition = e.offsetX;
    const barWidth = bar.clientWidth;
    const clickRatio = clickPosition / barWidth;

    if (!isNaN(currentSong.duration)) {
      currentSong.currentTime = currentSong.duration * clickRatio;
    }
  });

  // --- Update current time & duration as the song plays ---
  currentSong.addEventListener("timeupdate", () => {
    if (!isNaN(currentSong.duration)) {
      document.querySelector('.current-time').innerHTML = secondstominute(currentSong.currentTime);
      document.querySelector('.total-time').innerHTML = secondstominute(currentSong.duration);
      localStorage.setItem('lastPlayedTime', currentSong.currentTime);
      updateProgressBar();
    }
  });

  // --- Always show duration on loadedmetadata ---
  currentSong.addEventListener('loadedmetadata', () => {
    document.querySelector('.total-time').innerHTML = secondstominute(currentSong.duration);
    document.querySelector('.current-time').innerHTML = secondstominute(currentSong.currentTime);
    updateProgressBar();
  });

  // --- Save state on pause/play ---
  currentSong.addEventListener('pause', () => {
    localStorage.setItem('wasPlaying', 'false');
    localStorage.setItem('lastPlayedTime', currentSong.currentTime);
  });
  currentSong.addEventListener('play', () => {
    localStorage.setItem('wasPlaying', 'true');
    localStorage.setItem('lastPlayedTime', currentSong.currentTime);
  });

  // --- Save state before unload (refresh/close) ---
  window.addEventListener('beforeunload', () => {
    localStorage.setItem('lastPlayedTime', currentSong.currentTime);
    localStorage.setItem('wasPlaying', !currentSong.paused);
    localStorage.setItem('lastPlayedSong', songs[currentSongIndex]);
    localStorage.setItem('lastPlayedFolder', currFolder);
    localStorage.setItem('lastPlayedIndex', currentSongIndex);
    localStorage.setItem('lastVolume', currentSong.volume);
  });

  // --- Previous button: play previous song in list ---
  previous.addEventListener("click", () => {
    currentSong.pause();
    if (currentSongIndex > 0) {
      currentSongIndex--;
      playMusic(songs[currentSongIndex], {fromList: true, autoPlay: true});
    }
  });

  // --- Next button: play next song in list ---
  next.addEventListener("click", () => {
    currentSong.pause();
    if (currentSongIndex < songs.length - 1) {
      currentSongIndex++;
      playMusic(songs[currentSongIndex], {fromList: true, autoPlay: true});
    }
  });
}

// --- Call main() when the page is loaded ---
window.onload = () => {
  main();
};

// --- Hamburger sidebar toggle ---
const toggleBtn = document.getElementById('toggleSidebar');
const sidebar = document.getElementById('sidebar');

toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// --- Responsive sidebar: collapse on small screens ---
function autoCollapseSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (window.innerWidth <= 800) {
    sidebar.classList.add("collapsed");
  } else {
    sidebar.classList.remove("collapsed");
  }
}
window.addEventListener("resize", autoCollapseSidebar);
window.addEventListener("DOMContentLoaded", autoCollapseSidebar);

// --- Adds a shadow to the library header when scrolling ---
document.addEventListener('DOMContentLoaded', function () {
  const library = document.querySelector('.library');
  const header = document.querySelector('.library-header');

  if (library && header) {
    library.addEventListener('scroll', function () {
      if (library.scrollTop > 0) {
        header.classList.add('shadow-bottom');
      } else {
        header.classList.remove('shadow-bottom');
      }
    });
  }
});
