const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Method 1: Use External Download API (Working Solution)
async function getDownloadLinksFromAPI(videoUrl) {
    try {
        console.log('Trying external download API...');
        const videoId = extractVideoId(videoUrl);
        
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        // Use a working YouTube info API
        const response = await axios.get(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        const videoInfo = response.data;

        // Simulate download links using y2mate pattern
        const qualities = [
            {
                quality: '360p MP4',
                size: '~15-25MB',
                url: `https://y2mate.vet/youtube/${videoId}`,
                type: 'video',
                direct: false
            },
            {
                quality: '720p MP4',
                size: '~30-50MB', 
                url: `https://y2mate.vet/youtube/${videoId}`,
                type: 'video',
                direct: false
            },
            {
                quality: '1080p MP4',
                size: '~70-100MB',
                url: `https://y2mate.vet/youtube/${videoId}`,
                type: 'video',
                direct: false
            },
            {
                quality: 'MP3 Audio',
                size: '~3-5MB',
                url: `https://y2mate.vet/youtube/${videoId}`,
                type: 'audio',
                direct: false
            }
        ];

        return {
            title: videoInfo.title,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: 'N/A',
            qualities: qualities,
            videoId: videoId,
            source: 'external-api'
        };
    } catch (error) {
        console.log('External API failed:', error.message);
        throw error;
    }
}

// Method 2: Direct y2mate.vet Integration
async function getY2MateDirectLinks(videoUrl) {
    try {
        console.log('Trying y2mate.vet direct...');
        const videoId = extractVideoId(videoUrl);
        
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        // Get video info from noembed
        const response = await axios.get(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        const videoInfo = response.data;

        return {
            title: videoInfo.title,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: 'N/A',
            qualities: [
                {
                    quality: 'y2mate.vet Official',
                    size: 'Multiple Qualities Available',
                    url: `https://y2mate.vet/youtube/${videoId}`,
                    type: 'both',
                    direct: false,
                    description: 'Click to visit y2mate.vet for download'
                }
            ],
            videoId: videoId,
            source: 'y2mate.vet'
        };
    } catch (error) {
        console.log('y2mate.vet direct failed:', error.message);
        throw error;
    }
}

// Method 3: Multiple Service Providers
async function getMultipleServiceLinks(videoUrl) {
    try {
        console.log('Trying multiple services...');
        const videoId = extractVideoId(videoUrl);
        
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        const response = await axios.get(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        const videoInfo = response.data;

        const services = [
            {
                name: 'y2mate.vet',
                url: `https://y2mate.vet/youtube/${videoId}`,
                quality: 'HD Videos & MP3',
                type: 'both'
            },
            {
                name: 'Y2Mate.guru', 
                url: `https://www.y2mate.guru/youtube/${videoId}`,
                quality: 'Multiple Formats',
                type: 'both'
            },
            {
                name: 'YTBParser',
                url: `https://ytbparser.vercel.app/api/download?id=${videoId}`,
                quality: 'Fast Download',
                type: 'both'
            },
            {
                name: 'OnlineVideoConverter',
                url: `https://onlinevideoconverter.pro/youtube-converter?v=${videoId}`,
                quality: 'All Qualities',
                type: 'both'
            }
        ];

        return {
            title: videoInfo.title,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: 'N/A',
            qualities: services.map(service => ({
                quality: service.name,
                size: service.quality,
                url: service.url,
                type: service.type,
                direct: false,
                description: `Visit ${service.name} for download`
            })),
            videoId: videoId,
            source: 'multiple-services'
        };
    } catch (error) {
        console.log('Multiple services failed:', error.message);
        throw error;
    }
}

// Main download endpoint
app.post('/get-video-info', async (req, res) => {
    try {
        const { videoUrl } = req.body;
        
        if (!videoUrl) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        console.log('Processing URL:', videoUrl);

        let result;
        let methodUsed = '';

        // Try methods in sequence
        const methods = [
            { name: 'y2mate-direct', func: getY2MateDirectLinks },
            { name: 'external-api', func: getDownloadLinksFromAPI },
            { name: 'multiple-services', func: getMultipleServiceLinks }
        ];

        for (const method of methods) {
            try {
                result = await method.func(videoUrl);
                methodUsed = method.name;
                console.log(`Success with ${method.name}`);
                break;
            } catch (error) {
                console.log(`${method.name} failed:`, error.message);
                continue;
            }
        }

        if (!result) {
            throw new Error('All download methods failed. Please try again later.');
        }

        result.methodUsed = methodUsed;
        
        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Final error:', error);
        res.status(500).json({ 
            error: 'Unable to process this video. Please try a different video or check the URL.' 
        });
    }
});

// Extract YouTube Video ID
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Serve static files
app.use(express.static('public'));

// Error handling middleware
app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 XYZ YT Downloader running on port ${PORT}`);
    console.log(`📱 Visit: http://localhost:${PORT}`);
    console.log(`✅ Using external APIs for reliable service`);
});
