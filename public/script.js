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
    
    // Auto-focus on URL input
    videoUrl.focus();
    
    // Show success message
    showError(`"${video.title}" selected! Click "Get Download Links" to continue.`, 'success');
}

// Get Download Links
async function getDownloadLinks() {
    const url = videoUrl.value.trim();
    
    if (!url) {
        showError('Please enter a YouTube URL');
        return;
    }

    // Basic URL validation
    if (!isValidYouTubeUrl(url)) {
        showError('Please enter a valid YouTube URL');
        return;
    }

    showLoading();
    hideError();
    hideResults();
    hideSearchResults();

    try {
        const response = await fetch('/download', {
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
            showError(data.error || 'Failed to get download links');
        }
    } catch (err) {
        showError('Network error. Please check your connection and try again.');
        console.error('Download error:', err);
    } finally {
        hideLoading();
    }
}

// Display Download Options
function displayDownloadOptions(data) {
    videoInfo.innerHTML = `
        <div style="display: flex; align-items: center;">
            <img src="${data.thumbnail}" alt="Thumbnail" class="thumbnail" onerror="this.style.display='none'">
            <div>
                <h4>${data.title}</h4>
                <p>Duration: ${data.duration || 'N/A'}</p>
                <p><small>Source: ${data.source} | Method: ${data.methodUsed}</small></p>
            </div>
        </div>
    `;

    downloadOptions.innerHTML = '';

    if (data.qualities && data.qualities.length > 0) {
        data.qualities.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'download-option';
            
            const buttonText = option.direct ? 'Download Now' : 'Visit Download Page';
            const buttonClass = option.direct ? 'download-link-direct' : 'download-link-external';
            
            optionElement.innerHTML = `
                <div class="quality-info">
                    <span class="quality-badge ${option.type}">
                        ${option.type.toUpperCase()}
                    </span>
                    <span><strong>${option.quality}</strong></span>
                    <span>Size: ${option.size}</span>
                    <span class="source-badge">${option.source}</span>
                </div>
                <a href="${option.url}" class="download-link ${buttonClass}" 
                   ${option.direct ? 'download' : 'target="_blank"'}>
                    <i class="fas fa-download"></i> ${buttonText}
                </a>
            `;
            
            downloadOptions.appendChild(optionElement);
        });
    } else {
        downloadOptions.innerHTML = '<p>No download options available for this video.</p>';
    }

    // Add alternative methods section
    const alternativesSection = document.createElement('div');
    alternativesSection.className = 'alternatives-section';
    alternativesSection.innerHTML = `
        <h4>Alternative Download Methods</h4>
        <div class="alternative-buttons">
            <button onclick="openY2MateVet('${extractVideoId(videoUrl.value)}')" class="alt-btn y2mate-btn">
                <i class="fas fa-external-link-alt"></i> y2mate.vet Official
            </button>
            <button onclick="openAlternativeServices('${videoUrl.value}')" class="alt-btn alternative-btn">
                <i class="fas fa-link"></i> Other Services
            </button>
        </div>
    `;
    
    downloadOptions.appendChild(alternativesSection);
    showResults();
}

// Alternative download methods
function openY2MateVet(videoId) {
    if (videoId) {
        window.open(`https://y2mate.vet/youtube/${videoId}`, '_blank');
    } else {
        showError('Please enter a valid YouTube URL first');
    }
}

function openAlternativeServices(url) {
    const videoId = extractVideoId(url);
    if (videoId) {
        // Open multiple alternative services
        const services = [
            `https://y2mate.vet/youtube/${videoId}`,
            `https://www.y2mate.guru/youtube/${videoId}`,
            `https://ytbtomp3.com/download?v=${videoId}`
        ];
        
        services.forEach(service => {
            window.open(service, '_blank');
        });
    } else {
        showError('Please enter a valid YouTube URL first');
    }
}

// Extract video ID from URL
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
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
    error.textContent = message;
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
console.log('XYZ YT Downloader initialized');
