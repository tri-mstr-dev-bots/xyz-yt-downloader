const express = require('express');
const ytdl = require('ytdl-core');
const path = require('path');
const fs = require('fs');
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

// Get video info and available formats
app.post('/get-video-info', async (req, res) => {
    try {
        const { videoUrl } = req.body;
        
        if (!videoUrl) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        if (!ytdl.validateURL(videoUrl)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const videoInfo = await ytdl.getInfo(videoUrl);
        const videoDetails = videoInfo.videoDetails;

        const formats = {
            video: [],
            audio: []
        };

        // Get available video formats
        videoInfo.formats.forEach(format => {
            if (format.hasVideo && format.hasAudio && format.qualityLabel) {
                formats.video.push({
                    quality: format.qualityLabel,
                    itag: format.itag,
                    container: format.mimeType.split(';')[0].split('/')[1],
                    size: format.contentLength ? (format.contentLength / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown',
                    type: 'video'
                });
            } else if (format.hasAudio && !format.hasVideo) {
                formats.audio.push({
                    quality: format.audioQuality || 'audio',
                    itag: format.itag,
                    container: format.mimeType.split(';')[0].split('/')[1],
                    size: format.contentLength ? (format.contentLength / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown',
                    type: 'audio'
                });
            }
        });

        // Remove duplicates and sort
        formats.video = removeDuplicates(formats.video, 'quality');
        formats.audio = removeDuplicates(formats.audio, 'quality');

        res.json({
            success: true,
            data: {
                title: videoDetails.title,
                thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url,
                duration: formatDuration(videoDetails.lengthSeconds),
                formats: formats,
                videoId: videoDetails.videoId
            }
        });

    } catch (error) {
        console.error('Video info error:', error);
        res.status(500).json({ 
            error: 'Failed to get video information. Please check the URL.' 
        });
    }
});

// Direct Download Endpoint - Tumhari Website Se Hi Download Hoga!
app.get('/download/:type/:itag/:videoId', async (req, res) => {
    try {
        const { type, itag, videoId } = req.params;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        if (!ytdl.validateURL(videoUrl)) {
            return res.status(400).send('Invalid video ID');
        }

        const videoInfo = await ytdl.getInfo(videoUrl);
        const videoDetails = videoInfo.videoDetails;

        // Set appropriate headers for download
        const filename = `${videoDetails.title.replace(/[^a-z0-9]/gi, '_')}.${type === 'audio' ? 'mp3' : 'mp4'}`;
        
        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        
        if (type === 'audio') {
            res.header('Content-Type', 'audio/mpeg');
        } else {
            res.header('Content-Type', 'video/mp4');
        }

        // Stream the video directly to user
        const stream = ytdl(videoUrl, { 
            quality: itag,
            filter: type === 'audio' ? 'audioonly' : 'videoandaudio'
        });

        stream.pipe(res);

        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).send('Download failed');
            }
        });

    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).send('Download failed');
        }
    }
});

// Progressive Download - Better for large files
app.get('/progressive-download/:type/:itag/:videoId', async (req, res) => {
    try {
        const { type, itag, videoId } = req.params;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const videoInfo = await ytdl.getInfo(videoUrl);
        const videoDetails = videoInfo.videoDetails;

        const filename = `${videoDetails.title.replace(/[^a-z0-9]/gi, '_')}.${type === 'audio' ? 'mp3' : 'mp4'}`;
        
        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        
        if (type === 'audio') {
            res.header('Content-Type', 'audio/mpeg');
        } else {
            res.header('Content-Type', 'video/mp4');
        }

        const stream = ytdl(videoUrl, { 
            quality: itag,
            filter: type === 'audio' ? 'audioonly' : 'videoandaudio'
        });

        let downloaded = 0;
        
        stream.on('data', (chunk) => {
            downloaded += chunk.length;
            console.log(`Downloaded: ${(downloaded / (1024 * 1024)).toFixed(2)} MB`);
        });

        stream.on('end', () => {
            console.log('Download completed');
        });

        stream.pipe(res);

    } catch (error) {
        console.error('Progressive download error:', error);
        res.status(500).send('Download failed');
    }
});

// Utility functions
function removeDuplicates(array, key) {
    return array.filter((obj, index, self) => 
        index === self.findIndex((t) => (t[key] === obj[key]))
    );
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 XYZ YT Downloader running on port ${PORT}`);
    console.log(`📱 Visit: http://localhost:${PORT}`);
    console.log(`✅ Direct downloading enabled!`);
});
