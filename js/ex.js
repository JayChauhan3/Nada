
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
      // songs.push(element.href);
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

    li.addEventListener("click", () => {
      const actualFile = li.getAttribute("data-src");
        playMusic(actualFile);
    });
  }
  return songs;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Play music
const playMusic = (track, pause = false) => {
  const songUrl = `http://127.0.0.1:3000/video%2084/${currFolder}/` + encodeURIComponent(track);
  currentSong.src = songUrl;
  isSongLoaded = true;

  document.querySelector('.track-text').firstElementChild.innerHTML = track.replace(/\.mp3$/i, '');
  readTagsFromUrl(songUrl, '.cover', '.track-text p');
  localStorage.setItem('lastPlayedSong', track);

  currentSong.addEventListener('loadedmetadata', () => {
    document.querySelector('.current-time').innerHTML = '0:00';
    document.querySelector('.total-time').innerHTML = secondstominute(currentSong.duration);
  }, { once: true });

  if (!pause) {
    currentSong.play().then(() => {
      play.src = '../images/pause.svg';
    }).catch(err => {
      console.warn("Play blocked by browser:", err);
    });
  }

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
      console.log("Folder name:", folder);

      //get metadata of folder
      let a = await fetch(`http://127.0.0.1:3000/video%2084/songs/${folder}/info.json`);
      let response = await a.json();
      console.log(response);

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
    e.addEventListener(('click'), async item => {
      songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`)
      playMusic(songs[0])

    })
  });

}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Main
async function main() {
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');

  await getSongs("songs/liked");

  //Display Album on the right page
  displayAlbum()

  // let songul = document.querySelector('.library').getElementsByTagName("ul")[0];

  const lastPlayed = localStorage.getItem('lastPlayedSong');
  const lastTime = parseFloat(localStorage.getItem('lastPlayedTime')) || 0;
  let trackToShow = lastPlayed || (songs[0] ? decodeURIComponent(songs[0].split("/").pop()) : "");

  // Set up the audio source without autoplay
  currentSong.src = `http://127.0.0.1:3000/video%2084/${currFolder}/` + encodeURIComponent(trackToShow);
  isSongLoaded = true;

  currentSong.addEventListener('loadedmetadata', () => {
    if (!isNaN(currentSong.duration)) {
      currentSong.currentTime = Math.min(lastTime, currentSong.duration);
      document.querySelector('.total-time').innerHTML = secondstominute(currentSong.duration);
      document.querySelector('.current-time').innerHTML = secondstominute(currentSong.currentTime);
      updateProgressBar();
    }
  }, { once: true });

  document.querySelector('.track-text').firstElementChild.innerHTML =
    decodeURIComponent(trackToShow.replace(/\.mp3$/i, ''));
  readTagsFromUrl(currentSong.src, '.cover', '.track-text p');

  //render playlist

  ///////    /////


  // Play button logic
  play.addEventListener("click", () => {
    if (!isSongLoaded) {
      playMusic(trackToShow);
      return;
    }

    if (currentSong.paused) {
      currentSong.play();
      play.src = '../images/pause.svg';
    } else {
      currentSong.pause();
      play.src = '../images/pcontrol.svg';
    }
  });
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Volume controls
  const volumeInput = document.querySelector('.volume');
  const volumeIcon = document.querySelector('.volume-icon');
  let isMuted = false;
  let lastVolume = 1;

  // Volume slider change
  volumeInput.addEventListener('input', (e) => {
    const newVolume = parseInt(e.target.value) / 100;
    currentSong.volume = newVolume;

    if (newVolume > 0) {
      lastVolume = newVolume;
      isMuted = false;
    }

    updateVolumeUI(newVolume);
  });

  // Mute toggle on icon click
  volumeIcon.addEventListener('click', () => {
    if (isMuted) {
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
  });

  // Update UI (background + icon)
  function updateVolumeUI(volume) {
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


  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  //update progressbar
  function updateProgressBar() {
    const progress = document.querySelector('.progress');
    const percentage = (currentSong.currentTime / currentSong.duration) * 100;
    progress.style.width = `${percentage}%`;
  }

  document.querySelector('.bar').addEventListener('click', (e) => {
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
      // Save current time periodically
      localStorage.setItem('lastPlayedTime', currentSong.currentTime);
      updateProgressBar();
    }
  });

  //add an event listener on the previous
  previous.addEventListener("click", () => {
    currentSong.pause();
    console.log("Previous clicked");

    const currentFile = decodeURIComponent(currentSong.src.split("/").pop());

    let index = songs.findIndex(song => {
      return decodeURIComponent(song.split("/").pop()) === currentFile;
    });

    if (index > 0) {
      const prevTrack = decodeURIComponent(songs[index - 1].split("/").pop());
      playMusic(prevTrack);
    }
  });

  //add an event listener on the next
  next.addEventListener("click", () => {
    currentSong.pause();
    console.log("Next clicked");

    const currentFile = decodeURIComponent(currentSong.src.split("/").pop());

    let index = songs.findIndex(song => {
      return decodeURIComponent(song.split("/").pop()) === currentFile;
    });

    if (index !== -1 && (index + 1) < songs.length) {
      const nextTrack = decodeURIComponent(songs[index + 1].split("/").pop());
      playMusic(nextTrack);
    }
  });


}

//check if DOM elements like buttons, spans, or containers ready then call the functiom
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




