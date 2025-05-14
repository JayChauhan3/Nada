// Searchbar
const searchInput = document.getElementById('searchInput');
const clearButton = document.getElementById('clearButton');

searchInput.addEventListener('input', () => {
  clearButton.style.display = searchInput.value.length > 0 ? 'block' : 'none';
});

clearButton.addEventListener('click', () => {
  searchInput.value = '';
  clearButton.style.display = 'none';
  searchInput.focus();
});

// Header button toggle
const buttons = document.querySelectorAll('.hbtn');
buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//has to be top, before Function Called
let currentSong = new Audio();
const play = document.getElementById('play');
let isSongLoaded = false;
let currFolder;
let songs = [];
let currentSongIndex = 0;

// --- Volume State ---
let isMuted = false;
let lastVolume = 1;

// Helper: Format seconds as mm:ss
function secondstominute(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Get song list
async function getSongs(folder) {
  currentSongIndex = 0;
  currFolder = folder;
  let a = await fetch(`http://127.0.0.1:3000/video%2084/${currFolder}/`);
  let response = await a.text();

  let div = document.createElement('div');
  div.innerHTML = response;
  let as = div.getElementsByTagName('a');
  songs = [];

  for (let index = 0; index < as.length; index++) {
    const element = as[index];
    if (element.href.endsWith(".mp3")) {
      songs.push(decodeURIComponent(element.href.split("/").pop()));
    }
  }

  // Render song list with metadata reading
  let songul = document.querySelector('.library').getElementsByTagName("ul")[0];
  songul.innerHTML = ""
  for (const song of songs) {
    let name = decodeURIComponent(song.split("/").pop());
    let trackName = name.replace(/\.mp3$/i, '');

    const li = document.createElement('li');
    li.setAttribute('data-src', name);

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

    // li.addEventListener("click", () => {
    //   const actualFile = li.getAttribute("data-src");
    //   playMusic(actualFile, false, true); // always play from start and update state
    // });
    li.addEventListener("click", () => {
  const actualFile = li.getAttribute("data-src");
  playMusic(actualFile, false, true, 0, true); // force autoPlay = true
});

  }
  return songs;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Play music (updated to handle state and UI)
const playMusic = (track, pause = false, fromList = false, resumeTime = 0, autoPlay = true) => {
  const songUrl = `http://127.0.0.1:3000/video%2084/${currFolder}/` + encodeURIComponent(track);
  currentSong.src = songUrl;
  isSongLoaded = false;

  // Find and update currentSongIndex
  currentSongIndex = songs.findIndex(s => decodeURIComponent(s) === decodeURIComponent(track));

  document.querySelector('.track-text').firstElementChild.innerHTML = track.replace(/\.mp3$/i, '');
  readTagsFromUrl(songUrl, '.cover', '.track-text p');
  localStorage.setItem('lastPlayedSong', track);
  localStorage.setItem('lastPlayedFolder', currFolder);
  localStorage.setItem('lastPlayedIndex', currentSongIndex);

  currentSong.onloadedmetadata = () => {
    isSongLoaded = true;
    if (fromList) {
      currentSong.currentTime = 0;
      localStorage.setItem('lastPlayedTime', 0);
    } else if (resumeTime > 0 && resumeTime < currentSong.duration) {
      currentSong.currentTime = resumeTime;
      localStorage.setItem('lastPlayedTime', resumeTime);
    } else {
      currentSong.currentTime = pause ? 0 : currentSong.currentTime;
    }
    document.querySelector('.current-time').innerHTML = secondstominute(currentSong.currentTime);
    document.querySelector('.total-time').innerHTML = secondstominute(currentSong.duration);
    updateProgressBar();

    if (autoPlay && !pause) {
      currentSong.play().then(() => {
        play.src = '../images/pause.svg';
        localStorage.setItem('wasPlaying', 'true');
      }).catch(err => {
        play.src = '../images/pcontrol.svg';
        localStorage.setItem('wasPlaying', 'false');
      });
    } else {
      play.src = '../images/pcontrol.svg';
      localStorage.setItem('wasPlaying', 'false');
    }
  };
};

// Helper: Read tags from URL via blob
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

//Displat Album cards
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

      //get metadata of folder
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
  //load the playlist whenever card is clicked
Array.from(document.querySelectorAll('.card')).forEach(e => {
  e.addEventListener('click', async item => {
    const folder = `songs/${item.currentTarget.dataset.folder}`;
    songs = await getSongs(folder);

    // Remove any previous handler
    currentSong.onloadedmetadata = null;

    // Play first song, ensure UI is updated after loadedmetadata
    playMusic(songs[0], false, true, 0, false); // autoPlay = false

    currentSong.onloadedmetadata = () => {
      isSongLoaded = true;
      currentSong.currentTime = 0;
      currentSong.play().then(() => {
        play.src = '../images/pause.svg';
        localStorage.setItem('wasPlaying', 'true');
      }).catch(() => {
        play.src = '../images/pcontrol.svg';
        localStorage.setItem('wasPlaying', 'false');
      });
      document.querySelector('.current-time').innerHTML = secondstominute(currentSong.currentTime);
      document.querySelector('.total-time').innerHTML = secondstominute(currentSong.duration);
      updateProgressBar();
    };

    localStorage.setItem('lastPlayedFolder', folder);
    localStorage.setItem('lastPlayedIndex', 0);
    localStorage.setItem('lastPlayedTime', 0);
    localStorage.setItem('wasPlaying', 'true');
  });
});


}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// --- Volume UI ---
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

// --- Restore Volume ---
function restoreVolume() {
  const volumeInput = document.querySelector('.volume');
  let savedVolume = parseFloat(localStorage.getItem('lastVolume'));
  if (isNaN(savedVolume)) savedVolume = 1;
  currentSong.volume = savedVolume;
  if (volumeInput) volumeInput.value = savedVolume * 100;
  updateVolumeUI(savedVolume);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Main
async function main() {
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const volumeInput = document.querySelector('.volume');
  const volumeIcon = document.querySelector('.volume-icon');
  const bar = document.querySelector('.bar');

  // Try to restore last played folder, else liked
  currFolder = localStorage.getItem('lastPlayedFolder') || "songs/liked";
  songs = await getSongs(currFolder);
  


  //Display Album on the right page
  displayAlbum();

  // Restore last played song, time, and state
  const lastPlayed = localStorage.getItem('lastPlayedSong');
  const lastTime = parseFloat(localStorage.getItem('lastPlayedTime')) || 0;
  const wasPlaying = localStorage.getItem('wasPlaying') === 'true';
  let lastIndex = parseInt(localStorage.getItem('lastPlayedIndex'), 10);

  let trackToShow;
  if (lastPlayed && songs.includes(lastPlayed)) {
    trackToShow = lastPlayed;
    currentSongIndex = songs.indexOf(lastPlayed);
  } else {
    trackToShow = songs[0];
    currentSongIndex = 0;
  }

  // Set up the audio source and restore position/state
  playMusic(trackToShow, false, false, lastTime, wasPlaying);

  // Restore volume
  restoreVolume();

  // Play button logic
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

  // Volume controls
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

  // Mute toggle on icon click
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

  //update progressbar
  function updateProgressBar() {
    const progress = document.querySelector('.progress');
    if (!currentSong.duration) {
      progress.style.width = '0%';
      return;
    }
    const percentage = (currentSong.currentTime / currentSong.duration) * 100;
    progress.style.width = `${percentage}%`;
  }

  bar.addEventListener('click', (e) => {
    const bar = e.currentTarget;
    const clickPosition = e.offsetX;
    const barWidth = bar.clientWidth;
    const clickRatio = clickPosition / barWidth;

    if (!isNaN(currentSong.duration)) {
      currentSong.currentTime = currentSong.duration * clickRatio;
    }
  });

  // Update current time & duration
  currentSong.addEventListener("timeupdate", () => {
    if (!isNaN(currentSong.duration)) {
      document.querySelector('.current-time').innerHTML = secondstominute(currentSong.currentTime);
      document.querySelector('.total-time').innerHTML = secondstominute(currentSong.duration);
      localStorage.setItem('lastPlayedTime', currentSong.currentTime);
      updateProgressBar();
    }
  });

  // Always show duration on loadedmetadata
  currentSong.addEventListener('loadedmetadata', () => {
    document.querySelector('.total-time').innerHTML = secondstominute(currentSong.duration);
    document.querySelector('.current-time').innerHTML = secondstominute(currentSong.currentTime);
    updateProgressBar();
  });

  // Save state on pause/play
  currentSong.addEventListener('pause', () => {
    localStorage.setItem('wasPlaying', 'false');
    localStorage.setItem('lastPlayedTime', currentSong.currentTime);
  });
  currentSong.addEventListener('play', () => {
    localStorage.setItem('wasPlaying', 'true');
    localStorage.setItem('lastPlayedTime', currentSong.currentTime);
  });

  // Save state before unload
  window.addEventListener('beforeunload', () => {
    localStorage.setItem('lastPlayedTime', currentSong.currentTime);
    localStorage.setItem('wasPlaying', !currentSong.paused);
    localStorage.setItem('lastPlayedSong', songs[currentSongIndex]);
    localStorage.setItem('lastPlayedFolder', currFolder);
    localStorage.setItem('lastPlayedIndex', currentSongIndex);
    localStorage.setItem('lastVolume', currentSong.volume);
  });

  // Previous button
  previous.addEventListener("click", () => {
    currentSong.pause();
    if (currentSongIndex > 0) {
      currentSongIndex--;
      playMusic(songs[currentSongIndex], false, true, 0, true);
    }
  });

  // Next button
  next.addEventListener("click", () => {
    currentSong.pause();
    if (currentSongIndex < songs.length - 1) {
      currentSongIndex++;
      playMusic(songs[currentSongIndex], false, true, 0, true);
    }
  });
}

//check if DOM elements like buttons, spans, or containers ready then call the function
window.onload = () => {
  main();
};


//hamburger sidebar all
const toggleBtn = document.getElementById('toggleSidebar');
const sidebar = document.getElementById('sidebar');

toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

//responsive sidebar(when max-width = 800px)
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

// librarybox-shadow
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


