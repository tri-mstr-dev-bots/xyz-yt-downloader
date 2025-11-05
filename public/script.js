// DOM Elements
const searchInput = document.getElementById('searchInput');
const videoUrl = document.getElementById('videoUrl');
const searchBtn = document.getElementById('searchBtn');
const downloadBtn = document.getElementById('downloadBtn');
const results = document.getElementById('results');
const searchResults = document.getElementById('searchResults');
const searchResultsList = document.getElementById('searchResultsList');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const videoInfo = document.getElementById('videoInfo');
const downloadOptions = document.getElementById('downloadOptions');

// Event Listeners
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchVideos();
});

videoUrl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') getDownloadLinks();
});

// Search Videos using Malvin API
async function searchVideos() {
    const query = searchInput.value.trim();
    
    if (!query) {
        showError('Please enter a search term');
        return;
    }

    showLoading();
    hideError();
    hideResults();
    hideSearchResults();

    try {
        const response = await fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        if (data.success) {
            displaySearchResults(data.results);
        } else {
            showError(data.error || 'Search failed');
        }
    } catch (err) {
        showError('Network error. Please try again.');
        console.error('Search error:', err);
    } finally {
        hideLoading();
    }
}

// Display Search Results
function displaySearchResults(results) {
    if (!results || results.length === 0) {
        showError('No videos found for your search');
        return;
    }

    searchResultsList.innerHTML = '';

    results.forEach(video => {
        const videoElement = document.createElement('div');
        videoElement.className = 'search-result-item';
        videoElement.onclick = () => selectVideoFromSearch(video);
        
        videoElement.innerHTML = `
            <img src="${video.imageUrl}" alt="Thumbnail" class="search-result-thumbnail" 
                 onerror="this.src='https://via.placeholder.com/120x90?text=Thumbnail'">
            <div class="search-result-info">
                <div class="search-result-title">${video.title}</div>
                <div class="search-result-channel">${video.channel}</div>
                <div class="search-result-duration">${video.duration}</div>
            </div>
        `;
        
        searchResultsList.appendChild(videoElement);
    });

    showSearchResults();
}

// Select video from search results
function selectVideoFromSearch(video) {
    videoUrl.value = video.link;
    hideSearchResults();
    videoUrl.focus();
    showError(`"${video.title}" selected! Click "Get Download Links" to continue.`, 'success');
}

// Get Download Links - DIRECT FROM YOUR SERVER!
async function getDownloadLinks() {
    const url = videoUrl.value.trim();
    
    if (!url) {
        showError('Please enter a YouTube URL');
        return;
    }

    if (!isValidYouTubeUrl(url)) {
        showError('Please enter a valid YouTube URL');
        return;
    }

    showLoading();
    hideError();
    hideResults();
    hideSearchResults();

    try {
        const response = await fetch('/get-video-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ videoUrl: url })
        });

        const data = await response.json();

        if (data.success) {
            displayDownloadOptions(data.data);
        } else {
            showError(data.error || 'Failed to get video information');
        }
    } catch (err) {
        showError('Network error. Please check your connection and try again.');
        console.error('Download error:', err);
    } finally {
        hideLoading();
    }
}

// Display Download Options - DIRECT DOWNLOAD BUTTONS
function displayDownloadOptions(data) {
    videoInfo.innerHTML = `
        <div style="display: flex; align-items: center;">
            <img src="${data.thumbnail}" alt="Thumbnail" class="thumbnail" onerror="this.style.display='none'">
            <div>
                <h4>${data.title}</h4>
                <p>Duration: ${data.duration}</p>
                <p><small>Video ID: ${data.videoId}</small></p>
            </div>
        </div>
    `;

    downloadOptions.innerHTML = '';

    // Video Quality Options
    if (data.formats.video.length > 0) {
        const videoSection = document.createElement('div');
        videoSection.className = 'quality-section';
        videoSection.innerHTML = '<h4>🎥 Video Downloads</h4>';
        
        data.formats.video.forEach(format => {
            const optionElement = document.createElement('div');
            optionElement.className = 'download-option';
            
            optionElement.innerHTML = `
                <div class="quality-info">
                    <span class="quality-badge video">
                        VIDEO
                    </span>
                    <span><strong>${format.quality}</strong></span>
                    <span>Format: ${format.container}</span>
                    <span>Size: ${format.size}</span>
                </div>
                <button onclick="startDownload('video', '${format.itag}', '${data.videoId}', '${format.quality}')" 
                        class="download-btn direct-download-btn">
                    <i class="fas fa-download"></i> Download
                </button>
            `;
            
            videoSection.appendChild(optionElement);
        });
        
        downloadOptions.appendChild(videoSection);
    }

    // Audio Quality Options
    if (data.formats.audio.length > 0) {
        const audioSection = document.createElement('div');
        audioSection.className = 'quality-section';
        audioSection.innerHTML = '<h4>🎵 Audio Downloads</h4>';
        
        data.formats.audio.forEach(format => {
            const optionElement = document.createElement('div');
            optionElement.className = 'download-option';
            
            optionElement.innerHTML = `
                <div class="quality-info">
                    <span class="quality-badge audio">
                        AUDIO
                    </span>
                    <span><strong>${format.quality}</strong></span>
                    <span>Format: ${format.container}</span>
                    <span>Size: ${format.size}</span>
                </div>
                <button onclick="startDownload('audio', '${format.itag}', '${data.videoId}', '${format.quality}')" 
                        class="download-btn direct-download-btn">
                    <i class="fas fa-download"></i> Download
                </button>
            `;
            
            audioSection.appendChild(optionElement);
        });
        
        downloadOptions.appendChild(audioSection);
    }

    showResults();
}

// START DIRECT DOWNLOAD - Tumhari Website Se Hi!
function startDownload(type, itag, videoId, quality) {
    showError(`Starting ${quality} ${type} download...`, 'success');
    
    // Create download URL for your server
    const downloadUrl = `/download/${type}/${itag}/${videoId}`;
    
    // Create invisible link and click it
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = true;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show progress (optional)
    showDownloadProgress();
}

// Show download progress
function showDownloadProgress() {
    const progress = document.createElement('div');
    progress.className = 'download-progress';
    progress.innerHTML = `
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
        <p>Downloading... This may take a few moments</p>
    `;
    
    error.appendChild(progress);
    
    setTimeout(() => {
        if (progress.parentNode) {
            progress.remove();
        }
    }, 5000);
}

// Utility Functions
function isValidYouTubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return pattern.test(url);
}

function showLoading() {
    loading.style.display = 'block';
    searchBtn.disabled = true;
    downloadBtn.disabled = true;
}

function hideLoading() {
    loading.style.display = 'none';
    searchBtn.disabled = false;
    downloadBtn.disabled = false;
}

function showResults() {
    results.style.display = 'block';
}

function hideResults() {
    results.style.display = 'none';
}

function showSearchResults() {
    searchResults.style.display = 'block';
}

function hideSearchResults() {
    searchResults.style.display = 'none';
}

function showError(message, type = 'error') {
    error.innerHTML = message;
    error.style.display = 'block';
    
    if (type === 'success') {
        error.style.background = '#d4edda';
        error.style.color = '#155724';
        error.style.borderColor = '#c3e6cb';
    } else {
        error.style.background = '#f8d7da';
        error.style.color = '#721c24';
        error.style.borderColor = '#f5c6cb';
    }
}

function hideError() {
    error.style.display = 'none';
}

// Clear search results when starting new search
searchInput.addEventListener('input', () => {
    hideSearchResults();
    hideError();
});

// Initialize
console.log('XYZ YT Downloader with DIRECT DOWNLOAD initialized');
