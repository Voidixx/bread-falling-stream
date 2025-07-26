
class LiveStreamInteraction {
    constructor() {
        this.config = null;
        this.lastSubCount = 0;
        this.lastLikeCount = 0;
        this.isMonitoring = false;
        this.activeEffects = [];
        this.liveStreamId = null;
        this.currentApiKeyIndex = 0;
        this.apiKeyErrors = {};
        this.playTimeout = null;
        this.isVideoPlaying = false;
        this.lastPlayTime = 0;
        this.init();
    }

    async init() {
        try {
            await this.loadConfig();
            this.setupElements();
            await this.getInitialStats();
            await this.findLiveStream();
            this.startMonitoring();
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError('Failed to initialize. Check your API key and channel ID.');
        }
    }

    async loadConfig() {
        try {
            const response = await fetch('./config.json');
            this.config = await response.json();
        } catch (error) {
            throw new Error('Could not load configuration');
        }
    }

    getCurrentApiKey() {
        if (Array.isArray(this.config.youtube.apiKeys)) {
            return this.config.youtube.apiKeys[this.currentApiKeyIndex];
        }
        return this.config.youtube.apiKey; // Fallback for old config format
    }

    rotateApiKey() {
        if (Array.isArray(this.config.youtube.apiKeys) && this.config.youtube.apiKeys.length > 1) {
            this.currentApiKeyIndex = (this.currentApiKeyIndex + 1) % this.config.youtube.apiKeys.length;
            console.log(`Switched to API key ${this.currentApiKeyIndex + 1}/${this.config.youtube.apiKeys.length}`);
            return true;
        }
        return false;
    }

    setupElements() {
        this.subCountEl = document.getElementById('subCount');
        this.subGoalEl = document.getElementById('subGoal');
        this.progressFillEl = document.getElementById('progressFill');
        this.statsOverlay = document.getElementById('statsOverlay');
        this.videoBackground = document.getElementById('videoBackground');
        this.breadVideo = document.getElementById('breadVideo');

        // Set initial goal to next 25 milestone from current subscriber count (106)
        const initialGoal = Math.ceil(106 / 25) * 25;
        this.config.subscriberGoal = initialGoal > 106 ? initialGoal : initialGoal + 25;
        this.subGoalEl.textContent = this.config.subscriberGoal.toLocaleString();
        
        // Show video paused at the beginning
        this.breadVideo.currentTime = 0;
        this.breadVideo.pause();
        this.breadVideo.style.display = 'block';
        this.breadVideo.style.opacity = '1';
        
        // Create floating bread crumbs background effect
        this.createBreadCrumbsBackground();
    }

    async getChannelStats() {
        const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${this.config.youtube.channelId}&key=${this.getCurrentApiKey()}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) {
                if (data.error.reason === 'quotaExceeded' && this.rotateApiKey()) {
                    console.log('Quota exceeded, trying next API key...');
                    return this.getChannelStats(); // Retry with new key
                }
                throw new Error(data.error.message);
            }
            
            return data.items[0].statistics;
        } catch (error) {
            console.error('Error fetching channel stats:', error);
            throw error;
        }
    }

    async findLiveStream() {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${this.config.youtube.channelId}&eventType=live&type=video&key=${this.getCurrentApiKey()}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error && data.error.reason === 'quotaExceeded' && this.rotateApiKey()) {
                console.log('Quota exceeded in findLiveStream, trying next API key...');
                return this.findLiveStream(); // Retry with new key
            }
            
            if (data.items && data.items.length > 0) {
                this.liveStreamId = data.items[0].id.videoId;
                console.log('Live stream found:', this.liveStreamId);
            } else {
                console.log('No live stream currently active');
            }
        } catch (error) {
            console.error('Error finding live stream:', error);
        }
    }

    async getLiveStreamStats() {
        if (!this.liveStreamId) return null;
        
        const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,liveStreamingDetails&id=${this.liveStreamId}&key=${this.getCurrentApiKey()}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) {
                if (data.error.reason === 'quotaExceeded' && this.rotateApiKey()) {
                    console.log('Quota exceeded in getLiveStreamStats, trying next API key...');
                    return this.getLiveStreamStats(); // Retry with new key
                }
                throw new Error(data.error.message);
            }
            
            const video = data.items[0];
            if (!video) return null;
            
            // Check if stream is still live
            if (video.liveStreamingDetails && !video.liveStreamingDetails.actualEndTime) {
                return video.statistics;
            } else {
                // Stream ended, clear the ID
                this.liveStreamId = null;
                console.log('Live stream ended');
                return null;
            }
        } catch (error) {
            console.error('Error fetching live stream stats:', error);
            return null;
        }
    }

    async getInitialStats() {
        try {
            const stats = await this.getChannelStats();
            this.lastSubCount = parseInt(stats.subscriberCount);
            this.updateSubscriberDisplay(this.lastSubCount);
            
            // Get initial like count if live stream is active
            if (this.liveStreamId) {
                const liveStats = await this.getLiveStreamStats();
                if (liveStats) {
                    this.lastLikeCount = parseInt(liveStats.likeCount || 0);
                }
            }
        } catch (error) {
            console.error('Error getting initial stats:', error);
            // Use fallback data
            this.lastSubCount = 0;
            this.updateSubscriberDisplay(this.lastSubCount);
        }
    }

    updateSubscriberDisplay(count) {
        // Check if goal is reached and needs to be updated
        if (count >= this.config.subscriberGoal) {
            this.updateSubscriberGoal(count);
        }
        
        this.subCountEl.textContent = count.toLocaleString();
        const progress = Math.min((count / this.config.subscriberGoal) * 100, 100);
        this.progressFillEl.style.width = `${progress}%`;
    }

    updateSubscriberGoal(currentCount) {
        // Calculate new goal based on current count - increments of 25
        let newGoal = Math.ceil(currentCount / 25) * 25;
        
        // If we're exactly at a milestone, go to the next one
        if (newGoal === currentCount) {
            newGoal += 25;
        }
        
        // Only update if the goal actually changes
        if (newGoal > this.config.subscriberGoal) {
            this.config.subscriberGoal = newGoal;
            this.subGoalEl.textContent = newGoal.toLocaleString();
            
            // Show goal update notification
            this.showGoalUpdateNotification(newGoal);
        }
    }

    showGoalUpdateNotification(newGoal) {
        const notification = document.createElement('div');
        notification.className = 'goal-update-notification';
        notification.innerHTML = `
            <h2>🎯 GOAL REACHED!</h2>
            <p style="font-size: 1.2rem; margin: 10px 0;">New Goal: ${newGoal.toLocaleString()}</p>
            <p>Keep growing! 🚀</p>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        
        // Check for changes every 30 seconds to be more conservative on external hosting
        this.monitoringInterval = setInterval(() => {
            this.checkForChanges();
        }, 30000);
        
        // Search for live stream every 30 minutes to save quota
        this.liveStreamInterval = setInterval(() => {
            this.findLiveStream();
        }, 1800000); // 30 minutes
    }

    async checkForChanges() {
        try {
            // Check subscriber count every cycle (every 5 seconds)
            const stats = await this.getChannelStats();
            const currentSubCount = parseInt(stats.subscriberCount);
            
            console.log(`Current subs: ${currentSubCount}, Last subs: ${this.lastSubCount}`);
            
            if (currentSubCount !== this.lastSubCount) {
                if (currentSubCount > this.lastSubCount) {
                    const newSubs = currentSubCount - this.lastSubCount;
                    this.handleNewSubscriber(newSubs);
                } else {
                    console.log('Subscriber count decreased (unsubscribe detected)');
                }
                this.lastSubCount = currentSubCount;
                this.updateSubscriberDisplay(currentSubCount);
            }
            
            // Check like count on live stream every 4th cycle to reduce API calls
            if (this.checkCount % 4 === 1 && this.liveStreamId) {
                const liveStats = await this.getLiveStreamStats();
                if (liveStats) {
                    const currentLikeCount = parseInt(liveStats.likeCount || 0);
                    if (currentLikeCount > this.lastLikeCount) {
                        const newLikes = currentLikeCount - this.lastLikeCount;
                        for (let i = 0; i < newLikes; i++) {
                            this.handleLike();
                        }
                        this.lastLikeCount = currentLikeCount;
                    }
                }
            }
            
            this.checkCount = (this.checkCount || 0) + 1;
            
        } catch (error) {
            console.error('Error checking for changes:', error);
            // If we hit rate limits, increase interval temporarily
            if (error.message && error.message.includes('quota')) {
                console.log('API quota reached, slowing down requests...');
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = setInterval(() => {
                    this.checkForChanges();
                }, 15000); // Keep 15 seconds even when quota limited
            }
        }
    }

    handleLike() {
        this.createReversibleEffect();
    }

    createReversibleEffect() {
        const effectType = Math.floor(Math.random() * 4);
        
        switch(effectType) {
            case 0:
                this.createLikeFloatingEffect();
                break;
            case 1:
                this.createGlitchEffect();
                break;
            case 2:
                this.createScreenShake();
                break;
            case 3:
                this.createColorFlash();
                break;
        }
    }

    createLikeFloatingEffect() {
        const effects = ['👍', '❤️', '🔥', '✨', '💫', '🌟', '🎉', '💥'];
        const effect = effects[Math.floor(Math.random() * effects.length)];
        
        const element = document.createElement('div');
        element.className = 'like-effect';
        element.textContent = effect;
        element.style.left = Math.random() * (window.innerWidth - 100) + 'px';
        element.style.top = Math.random() * (window.innerHeight - 100) + 'px';
        
        document.body.appendChild(element);
        this.activeEffects.push(element);
        
        // Auto-remove after animation
        setTimeout(() => {
            this.removeEffect(element);
        }, 2000);
    }

    createGlitchEffect() {
        const element = document.createElement('div');
        element.className = 'glitch-effect';
        
        document.body.appendChild(element);
        this.activeEffects.push(element);
        
        setTimeout(() => {
            this.removeEffect(element);
        }, 500);
    }

    createScreenShake() {
        this.videoBackground.classList.add('screen-shake');
        this.statsOverlay.classList.add('screen-shake');
        
        setTimeout(() => {
            this.videoBackground.classList.remove('screen-shake');
            this.statsOverlay.classList.remove('screen-shake');
        }, 500);
    }

    createColorFlash() {
        const element = document.createElement('div');
        element.className = 'color-flash';
        
        document.body.appendChild(element);
        this.activeEffects.push(element);
        
        setTimeout(() => {
            this.removeEffect(element);
        }, 1000);
    }

    removeEffect(element) {
        const index = this.activeEffects.indexOf(element);
        if (index > -1) {
            this.activeEffects.splice(index, 1);
        }
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }

    clearAllEffects() {
        this.activeEffects.forEach(effect => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        });
        this.activeEffects = [];
        
        // Remove any lingering classes
        this.videoBackground.classList.remove('screen-shake');
        this.statsOverlay.classList.remove('screen-shake');
    }

    handleNewSubscriber(count = 1) {
        console.log(`NEW SUBSCRIBER DETECTED! Count: ${count}`);
        
        const now = Date.now();
        
        // Debounce: prevent playing if video was played recently (within 2 seconds)
        if (now - this.lastPlayTime < 2000) {
            console.log('Video played recently, skipping to prevent overlap');
            return;
        }
        
        // Prevent multiple plays if video is currently playing
        if (this.isVideoPlaying || !this.breadVideo.paused) {
            console.log('Video already playing, skipping duplicate play');
            return;
        }
        
        // Set playing state immediately to prevent concurrent calls
        this.isVideoPlaying = true;
        this.lastPlayTime = now;
        
        // Stop any currently playing audio and reset
        this.breadVideo.pause();
        this.breadVideo.currentTime = 0;
        
        // Ensure video is visible
        this.breadVideo.style.display = 'block';
        this.breadVideo.style.opacity = '1';
        
        // Clear any pending timeouts
        if (this.playTimeout) {
            clearTimeout(this.playTimeout);
        }
        
        // Play immediately without delay
        this.breadVideo.play().then(() => {
            console.log('Bread video started playing successfully');
        }).catch(err => {
            console.log('Video play failed (likely autoplay restriction):', err);
            this.isVideoPlaying = false; // Reset state on error
            
            // Show click-to-enable notice for autoplay restrictions
            this.showAutoplayNotice();
        });
        
        // When video ends, reset state and pause
        this.breadVideo.addEventListener('ended', () => {
            this.breadVideo.currentTime = 0;
            this.breadVideo.pause();
            this.isVideoPlaying = false;
            console.log('Video ended, reset to beginning and paused');
        }, { once: true });
        
        // Safety timeout to reset state if video doesn't end properly
        setTimeout(() => {
            if (this.isVideoPlaying) {
                this.isVideoPlaying = false;
                console.log('Safety timeout: reset video playing state');
            }
        }, 10000); // 10 seconds safety timeout
    }

    showSubscriberNotification(count) {
        // Small, non-intrusive notification that doesn't block the video
        const notification = document.createElement('div');
        notification.className = 'small-subscriber-notification';
        notification.innerHTML = `+${count} subscriber${count > 1 ? 's' : ''}! 🎉`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2000);
    }

    createBreadCrumbsBackground() {
        const breadCrumbsContainer = document.createElement('div');
        breadCrumbsContainer.className = 'bread-crumbs';
        document.body.appendChild(breadCrumbsContainer);
        
        const breadEmojis = ['🍞', '🥖', '🥐', '🧄', '🌾', '✨'];
        
        setInterval(() => {
            if (document.querySelectorAll('.bread-crumb').length < 8) {
                const crumb = document.createElement('div');
                crumb.className = 'bread-crumb';
                crumb.textContent = breadEmojis[Math.floor(Math.random() * breadEmojis.length)];
                crumb.style.left = Math.random() * 100 + '%';
                crumb.style.animationDelay = Math.random() * 2 + 's';
                crumb.style.fontSize = (Math.random() * 1 + 1) + 'rem';
                
                breadCrumbsContainer.appendChild(crumb);
                
                setTimeout(() => {
                    if (crumb.parentNode) {
                        crumb.parentNode.removeChild(crumb);
                    }
                }, 15000);
            }
        }, 2000);
    }

    showAutoplayNotice() {
        // Only show once per session
        if (this.autoplayNoticeShown) return;
        this.autoplayNoticeShown = true;
        
        const notice = document.createElement('div');
        notice.className = 'autoplay-notice';
        notice.innerHTML = `
            <div style="background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; text-align: center; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000;">
                <h3>🍞 Enable Sound for Bread Effects! 🍞</h3>
                <p>Click anywhere to enable audio autoplay</p>
                <button onclick="this.parentElement.parentElement.remove(); document.body.click();" style="padding: 10px 20px; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">Enable Audio</button>
            </div>
        `;
        
        document.body.appendChild(notice);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notice.parentNode) {
                notice.parentNode.removeChild(notice);
            }
        }, 10000);
    }

    showError(message) {
        console.error(message);
        this.subCountEl.textContent = 'Error';
    }

    stopMonitoring() {
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        if (this.liveStreamInterval) {
            clearInterval(this.liveStreamInterval);
        }
    }
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', () => {
    new LiveStreamInteraction();
});

// Add keyboard shortcut to clear effects (for testing)
document.addEventListener('keydown', (e) => {
    if (e.key === 'c' && e.ctrlKey) {
        window.liveStream?.clearAllEffects();
    }
});

// Store instance globally for debugging
let liveStreamInstance;
document.addEventListener('DOMContentLoaded', () => {
    liveStreamInstance = new LiveStreamInteraction();
    window.liveStream = liveStreamInstance;
});
