const express = require('express');
const y2mate = require('y2mate-dl');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Search YouTube videos using Malvin API
app.post('/search', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        console.log('Searching for:', query);
        
        // Use Malvin API for YouTube search
        const searchResponse = await fetch(`https://malvin-api.vercel.app/search/youtube?q=${encodeURIComponent(query)}`);
        
        if (!searchResponse.ok) {
            throw new Error('Search API failed');
        }

        const searchData = await searchResponse.json();
        
        if (searchData.status && searchData.result) {
            res.json({ 
                success: true, 
                results: searchData.result 
            });
        } else {
            throw new Error('No results found');
        }
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            error: 'Search failed. Please try again later.' 
        });
    }
});

// Method 1: y2mate-dl (Primary)
async function getY2MateDownloadLinks(videoUrl) {
    try {
        console.log('Trying y2mate-dl...');
        const result = await y2mate.get(videoUrl);
        
        if (!result || !result.video) {
            throw new Error('No download links found');
        }

        const downloadLinks = {
            title: result.video.title,
            thumbnail: result.video.thumbnail,
            duration: result.video.duration,
            qualities: [],
            source: 'y2mate-dl'
        };

        if (result.video.links) {
            Object.keys(result.video.links).forEach(quality => {
                const link = result.video.links[quality];
                if (link && link.url) {
                    downloadLinks.qualities.push({
                        quality: quality,
                        size: link.size || 'N/A',
                        url: link.url,
                        type: quality.includes('audio') ? 'audio' : 'video',
                        source: 'y2mate-dl'
                    });
                }
            });
        }

        return downloadLinks;
    } catch (error) {
        console.log('y2mate-dl failed:', error.message);
        throw error;
    }
}

// Method 2: y2mate.vet Official Website API
async function getY2MateVetDownloadLinks(videoUrl) {
    try {
        console.log('Trying y2mate.vet official...');
        
        // Extract video ID from URL
        const videoId = extractVideoId(videoUrl);
        if (!videoId) throw new Error('Invalid YouTube URL');

        // This is a simulation - in production you'd use y2mate.vet API
        // For now, we'll create direct links to y2mate.vet website
        const y2mateVetUrl = `https://y2mate.vet/youtube/${videoId}`;
        
        return {
            title: 'Download via y2mate.vet Official',
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: 'N/A',
            qualities: [
                {
                    quality: 'Official y2mate.vet Website',
                    size: 'Multiple Qualities',
                    url: y2mateVetUrl,
                    type: 'both',
                    source: 'y2mate.vet',
                    direct: false
                }
            ],
            source: 'y2mate.vet'
        };
    } catch (error) {
        console.log('y2mate.vet failed:', error.message);
        throw error;
    }
}

// Method 3: Alternative Downloader - Online Service
async function getAlternativeDownloadLinks(videoUrl) {
    try {
        console.log('Trying alternative downloader...');
        
        const videoId = extractVideoId(videoUrl);
        if (!videoId) throw new Error('Invalid YouTube URL');

        // Alternative online services
        const alternatives = [
            {
                name: 'Y2Mate.guru',
                url: `https://www.y2mate.guru/youtube/${videoId}`,
                quality: 'Multiple Formats',
                type: 'both'
            },
            {
                name: 'YTBToMP3',
                url: `https://ytbtomp3.com/download?v=${videoId}`,
                quality: 'MP3/MP4',
                type: 'both'
            },
            {
                name: 'OnlineVideoConverter',
                url: `https://onlinevideoconverter.pro/youtube-converter?v=${videoId}`,
                quality: 'Multiple Qualities',
                type: 'both'
            }
        ];

        return {
            title: 'Alternative Download Services',
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: 'N/A',
            qualities: alternatives.map(alt => ({
                quality: alt.name,
                size: alt.quality,
                url: alt.url,
                type: alt.type,
                source: 'alternative',
                direct: false
            })),
            source: 'alternative'
        };
    } catch (error) {
        console.log('Alternative downloader failed:', error.message);
        throw error;
    }
}

// Method 4: Direct Server Download (Basic)
async function getDirectDownloadLinks(videoUrl) {
    try {
        console.log('Trying direct download...');
        
        const videoId = extractVideoId(videoUrl);
        if (!videoId) throw new Error('Invalid YouTube URL');

        // Create direct download links using y2mate pattern
        const directLinks = [
            {
                quality: 'MP3 Audio (128kbps)',
                size: '~3-5MB',
                url: `/api/download/${videoId}/mp3`,
                type: 'audio',
                source: 'direct',
                direct: true
            },
            {
                quality: '360p Video',
                size: '~10-20MB',
                url: `/api/download/${videoId}/360`,
                type: 'video',
                source: 'direct',
                direct: true
            },
            {
                quality: '720p Video',
                size: '~30-50MB',
                url: `/api/download/${videoId}/720`,
                type: 'video',
                source: 'direct',
                direct: true
            }
        ];

        return {
            title: 'Direct Server Download',
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: 'N/A',
            qualities: directLinks,
            source: 'direct'
        };
    } catch (error) {
        console.log('Direct download failed:', error.message);
        throw error;
    }
}

// Extract YouTube Video ID
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Main download endpoint - tries multiple methods
app.post('/download', async (req, res) => {
    try {
        const { videoUrl } = req.body;
        
        if (!videoUrl) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        console.log('Fetching download links for:', videoUrl);

        let result;
        let methodUsed = '';

        // Try methods in sequence until one works
        const methods = [
            { name: 'y2mate.vet', func: getY2MateVetDownloadLinks },
            { name: 'y2mate-dl', func: getY2MateDownloadLinks },
            { name: 'alternative', func: getAlternativeDownloadLinks },
            { name: 'direct', func: getDirectDownloadLinks }
        ];

        for (const method of methods) {
            try {
                result = await method.func(videoUrl);
                methodUsed = method.name;
                console.log(`Success with ${method.name}`);
                break;
            } catch (error) {
                console.log(`${method.name} failed, trying next...`);
                continue;
            }
        }

        if (!result) {
            throw new Error('All download methods failed');
        }

        // Add method info to response
        result.methodUsed = methodUsed;
        
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch download links. Please try again or use the alternative methods.' 
        });
    }
});

// Direct download endpoint (placeholder)
app.get('/api/download/:videoId/:format', async (req, res) => {
    const { videoId, format } = req.params;
    
    // Redirect to external service for actual download
    const externalUrl = `https://y2mate.vet/youtube/${videoId}`;
    res.redirect(externalUrl);
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 XYZ YT Downloader running on port ${PORT}`);
    console.log(`📱 Visit: http://localhost:${PORT}`);
});
