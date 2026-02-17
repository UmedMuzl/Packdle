// Packdle Game Logic
class PackdleGame {
    constructor() {
        this.songs = [];
        this.currentSong = null;
        this.mode = null;
        this.attempts = [];
        this.maxAttempts = 6;
        this.durations = [1, 2, 4, 7, 11, 16]; // Progressive reveal durations in seconds
        this.isPlaying = false;
        this.audioPlayer = null;
        this.youtubePlayer = null;
        this.gameOver = false;
        this.selectedIndex = -1;
        
        this.init();
    }
    
    async init() {
        // Get game mode from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.mode = urlParams.get('mode') || 'daily';
        
        // Load songs
        await this.loadSongs();
        
        // Load or create game state
        this.loadGameState();
        
        // Initialize UI
        this.initUI();
        
        // Load YouTube API if needed
        this.loadYouTubeAPI();
    }
    
    async loadSongs() {
        try {
            const response = await fetch('songs_data.json');
            this.songs = await response.json();
            console.log(`Loaded ${this.songs.length} songs`);
        } catch (error) {
            console.error('Error loading songs:', error);
            alert('Failed to load song data. Please refresh the page.');
        }
    }
    
    loadGameState() {
        if (this.mode === 'daily') {
            const today = this.getDateString();
            const savedState = localStorage.getItem(`packdle_daily_${today}`);
            
            if (savedState) {
                const state = JSON.parse(savedState);
                this.currentSong = state.currentSong;
                this.attempts = state.attempts || [];
                this.gameOver = state.gameOver || false;
            } else {
                // Start new daily game
                this.currentSong = this.getDailySong();
                this.saveGameState();
            }
        } else {
            // Random mode - always start fresh
            this.currentSong = this.getRandomSong();
        }
    }
    
    saveGameState() {
        if (this.mode === 'daily') {
            const today = this.getDateString();
            const state = {
                currentSong: this.currentSong,
                attempts: this.attempts,
                gameOver: this.gameOver
            };
            localStorage.setItem(`packdle_daily_${today}`, JSON.stringify(state));
        }
    }
    
    getDateString() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    
    getDailySong() {
        // Seeded random based on date
        const today = this.getDateString();
        const seed = this.hashCode(today);
        const index = Math.abs(seed) % this.songs.length;
        return this.songs[index];
    }
    
    getRandomSong() {
        const index = Math.floor(Math.random() * this.songs.length);
        return this.songs[index];
    }
    
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
    
    initUI() {
        // Buttons
        document.getElementById('homeBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        document.getElementById('helpBtn').addEventListener('click', () => {
            this.showModal('helpModal');
        });
        
        document.getElementById('statsBtn').addEventListener('click', () => {
            this.updateStats();
            this.showModal('statsModal');
        });
        
        document.getElementById('playBtn').addEventListener('click', () => {
            this.playAudio();
        });
        
        document.getElementById('submitBtn').addEventListener('click', () => {
            this.submitGuess();
        });
        
        document.getElementById('skipBtn').addEventListener('click', () => {
            this.skipAttempt();
        });
        
        // Input and autocomplete
        const input = document.getElementById('guessInput');
        input.addEventListener('input', () => this.handleInput());
        input.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Modal close buttons
        document.getElementById('closeHelp').addEventListener('click', () => {
            this.hideModal('helpModal');
        });
        
        document.getElementById('closeStats').addEventListener('click', () => {
            this.hideModal('statsModal');
        });
        
        document.getElementById('closeGameOver').addEventListener('click', () => {
            this.hideModal('gameOverModal');
        });
        
        document.getElementById('shareBtn').addEventListener('click', () => {
            this.shareResults();
        });
        
        document.getElementById('listenFullBtn').addEventListener('click', () => {
            this.hideModal('gameOverModal');
            this.playAudio(true);
        });
        
        document.getElementById('newGameBtn').addEventListener('click', () => {
            if (this.mode === 'random') {
                window.location.reload();
            } else {
                window.location.href = 'game.html?mode=random';
            }
        });
        
        // Close modals on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
        
        // Render existing attempts
        this.renderAttempts();
        
        // Check if game is already over
        if (this.gameOver) {
            this.endGame();
        }
    }
    
    loadYouTubeAPI() {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    }
    
    isYouTubeURL(url) {
        return url.includes('youtube.com') || url.includes('youtu.be');
    }
    
    extractYouTubeID(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
            /youtube\.com\/embed\/([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }
    
    initializePlayer() {
        const container = document.getElementById('playerContainer');
        
        if (this.isYouTubeURL(this.currentSong.audio)) {
            // YouTube player
            const videoId = this.extractYouTubeID(this.currentSong.audio);
            
            if (!videoId) {
                console.error('Could not extract YouTube video ID');
                return;
            }
            
            container.innerHTML = '<div id="ytPlayer"></div>';
            
            const initYT = () => {
                this.youtubePlayer = new YT.Player('ytPlayer', {
                    height: '0',
                    width: '0',
                    videoId: videoId,
                    playerVars: {
                        controls: 0,
                        disablekb: 1,
                        fs: 0,
                        modestbranding: 1
                    },
                    events: {
                        onReady: () => {
                            console.log('YouTube player ready');
                            this.renderProgressSegments();
                        },
                        onStateChange: (event) => {
                            if (event.data === YT.PlayerState.PLAYING) {
                                this.startProgressTracking();
                            }
                        }
                    }
                });
            };
            
            if (window.YT && window.YT.Player) {
                initYT();
            } else {
                window.onYouTubeIframeAPIReady = initYT;
            }
        } else {
            // HTML5 audio player
            container.innerHTML = `<audio id="audioPlayer" preload="metadata"><source src="${this.currentSong.audio}" type="audio/mpeg"></audio>`;
            this.audioPlayer = document.getElementById('audioPlayer');
            
            this.audioPlayer.addEventListener('loadedmetadata', () => {
                console.log('Audio loaded');
                this.renderProgressSegments();
            });
            
            this.audioPlayer.addEventListener('play', () => {
                this.startProgressTracking();
            });
            
            this.audioPlayer.addEventListener('ended', () => {
                this.stopProgressTracking();
            });
            
            this.audioPlayer.addEventListener('error', (e) => {
                console.error('Audio error:', e);
            });
        }
    }
    
    renderProgressSegments() {
        const container = document.getElementById('progressSegments');
        const songDuration = this.currentSong.duration || 180; // fallback to 3 minutes
        const currentAttempt = this.attempts.length;
        
        container.innerHTML = this.durations.map((duration, index) => {
            // Calculate width as difference between this duration and previous
            const prevDuration = index > 0 ? this.durations[index - 1] : 0;
            const segmentWidth = duration - prevDuration;
            const widthPercent = (segmentWidth / songDuration) * 100;
            const isUnlocked = index < currentAttempt;
            const className = isUnlocked ? 'progress-segment unlocked' : 'progress-segment locked';
            return `<div class="${className}" style="width: ${widthPercent}%"></div>`;
        }).join('');
    }
    
    compareTags(guessedTags, correctTags) {
        const guessedSet = new Set(guessedTags.map(t => t.toLowerCase()));
        const correctSet = new Set(correctTags.map(t => t.toLowerCase()));
        
        const common = [];
        const extra = [];
        
        guessedTags.forEach(tag => {
            if (correctSet.has(tag.toLowerCase())) {
                common.push(tag);
            } else {
                extra.push(tag);
            }
        });
        
        // Determine overall status
        let status = 'absent';
        if (common.length > 0 && extra.length === 0 && common.length === correctTags.length) {
            status = 'correct';
        } else if (common.length > 0) {
            status = 'present';
        }
        
        return {
            status: status,
            common: common,
            extra: extra
        };
    }
    
    playAudio(fullSong = false) {
        if (this.gameOver && !fullSong) return;
        
        const currentAttempt = this.attempts.length;
        if (currentAttempt >= this.maxAttempts && !fullSong) return;
        
        const maxDuration = fullSong ? this.currentSong.duration : this.durations[currentAttempt];
        
        // Initialize player on first play
        if (!this.audioPlayer && !this.youtubePlayer) {
            this.initializePlayer();
            // Wait a bit for player to initialize
            setTimeout(() => this.playAudio(), 500);
            return;
        }
        
        if (this.youtubePlayer) {
            this.youtubePlayer.seekTo(0);
            this.youtubePlayer.playVideo();
            
            if (!fullSong) {
                setTimeout(() => {
                    this.youtubePlayer.pauseVideo();
                    this.stopProgressTracking();
                }, maxDuration * 1000);
            }
        } else if (this.audioPlayer) {
            this.audioPlayer.currentTime = 0;
            this.audioPlayer.play();
            
            if (!fullSong) {
                setTimeout(() => {
                    this.audioPlayer.pause();
                    this.stopProgressTracking();
                }, maxDuration * 1000);
            }
        }
        
        this.isPlaying = true;
        const btnText = fullSong ? '🎵 Playing Full Song...' : '⏸ Playing...';
        document.getElementById('playBtn').textContent = btnText;
    }
    
    startProgressTracking() {
        const currentAttempt = this.attempts.length;
        const maxDuration = this.durations[currentAttempt];
        const songDuration = this.currentSong.duration || 180;
        
        this.progressInterval = setInterval(() => {
            let currentTime = 0;
            
            if (this.youtubePlayer) {
                currentTime = this.youtubePlayer.getCurrentTime();
            } else if (this.audioPlayer) {
                currentTime = this.audioPlayer.currentTime;
            }
            
            // Progress based on full song duration
            const progress = Math.min((currentTime / songDuration) * 100, 100);
            document.getElementById('progressFill').style.width = `${progress}%`;
            
            const current = Math.floor(currentTime);
            const total = Math.floor(songDuration);
            document.getElementById('timeDisplay').textContent = 
                `${Math.floor(current / 60)}:${String(current % 60).padStart(2, '0')} / ${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
        }, 100);
    }
    
    stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        this.isPlaying = false;
        document.getElementById('playBtn').textContent = '▶ Play';
        document.getElementById('progressFill').style.width = '0%';
    }
    
    handleInput() {
        const input = document.getElementById('guessInput');
        const query = input.value.trim().toLowerCase();
        
        if (query.length === 0) {
            this.hideAutocomplete();
            return;
        }
        
        // Filter songs
        const matches = this.songs.filter(song => {
            const searchString = `${song.game} - ${song.song}`.toLowerCase();
            return searchString.includes(query);
        }).slice(0, 10); // Limit to 10 results
        
        this.showAutocomplete(matches);
    }
    
    showAutocomplete(matches) {
        const dropdown = document.getElementById('autocompleteDropdown');
        
        if (matches.length === 0) {
            this.hideAutocomplete();
            return;
        }
        
        dropdown.innerHTML = matches.map((song, index) => {
            const fullName = `${song.game} - ${song.song}`;
            
            // Check if already guessed
            const previousGuess = this.attempts.find(a => 
                !a.skipped && a.guess.toLowerCase() === fullName.toLowerCase()
            );
            
            let tagsHTML = '';
            if (song.tags && song.tags.length > 0) {
                // Always show colored tags based on target song (like Donkdle shows moves)
                const targetTags = new Set((this.currentSong.tags || []).map(t => t.toLowerCase()));
                tagsHTML = '<div class="autocomplete-tags">';
                song.tags.forEach(tag => {
                    const isCorrect = targetTags.has(tag.toLowerCase());
                    const className = isCorrect ? 'tag-chip tag-correct' : 'tag-chip tag-absent';
                    tagsHTML += `<span class="${className}">${tag}</span>`;
                });
                tagsHTML += '</div>';
            }
            
            return `
                <div class="autocomplete-item ${previousGuess ? 'already-guessed' : ''}" data-index="${index}">
                    <div class="autocomplete-main">${fullName}</div>
                    <div class="autocomplete-details">${song.game} • ${song.song}</div>
                    ${tagsHTML}
                </div>
            `;
        }).join('');
        
        dropdown.classList.add('show');
        this.autocompleteMatches = matches;
        this.selectedIndex = -1;
        
        // Add click handlers
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.selectAutocomplete(index);
            });
        });
    }
    
    hideAutocomplete() {
        document.getElementById('autocompleteDropdown').classList.remove('show');
        this.autocompleteMatches = [];
        this.selectedIndex = -1;
    }
    
    selectAutocomplete(index) {
        if (this.autocompleteMatches && this.autocompleteMatches[index]) {
            const song = this.autocompleteMatches[index];
            document.getElementById('guessInput').value = `${song.game} - ${song.song}`;
            this.hideAutocomplete();
        }
    }
    
    handleKeydown(e) {
        const dropdown = document.getElementById('autocompleteDropdown');
        
        if (!dropdown.classList.contains('show')) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = Math.min(this.selectedIndex + 1, this.autocompleteMatches.length - 1);
            this.updateAutocompleteSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
            this.updateAutocompleteSelection();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.selectedIndex >= 0) {
                this.selectAutocomplete(this.selectedIndex);
            } else {
                this.submitGuess();
            }
        } else if (e.key === 'Escape') {
            this.hideAutocomplete();
        }
    }
    
    updateAutocompleteSelection() {
        const items = document.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    submitGuess() {
        if (this.gameOver) return;
        
        const input = document.getElementById('guessInput');
        const guess = input.value.trim();
        
        if (!guess) {
            alert('Please enter a guess!');
            return;
        }
        
        const correctAnswer = `${this.currentSong.game} - ${this.currentSong.song}`;
        const isCorrect = guess.toLowerCase() === correctAnswer.toLowerCase();
        
        // Find the guessed song object
        const guessedSong = this.songs.find(s => 
            `${s.game} - ${s.song}`.toLowerCase() === guess.toLowerCase()
        );
        
        if (!guessedSong) {
            alert('Please select a valid song from the list!');
            return;
        }
        
        // Create detailed feedback
        const feedback = {
            game: {
                value: guessedSong.game,
                status: guessedSong.game === this.currentSong.game ? 'correct' : 'absent'
            },
            song: {
                value: guessedSong.song,
                status: guessedSong.song === this.currentSong.song ? 'correct' : 'absent'
            },
            tags: this.compareTags(guessedSong.tags || [], this.currentSong.tags || [])
        };
        
        this.attempts.push({
            guess: guess,
            song: guessedSong,
            correct: isCorrect,
            feedback: feedback,
            skipped: false
        });
        
        this.saveGameState();
        this.renderAttempts();
        this.renderProgressSegments();
        
        input.value = '';
        this.hideAutocomplete();
        
        if (isCorrect) {
            this.gameOver = true;
            this.saveGameState();
            this.updateStatsAfterGame(true);
            setTimeout(() => this.endGame(true), 500);
        } else if (this.attempts.length >= this.maxAttempts) {
            this.gameOver = true;
            this.saveGameState();
            this.updateStatsAfterGame(false);
            setTimeout(() => this.endGame(false), 500);
        }
    }
    
    skipAttempt() {
        if (this.gameOver) return;
        
        this.attempts.push({
            guess: '',
            correct: false,
            skipped: true
        });
        
        this.saveGameState();
        this.renderAttempts();
        this.renderProgressSegments();
        
        if (this.attempts.length >= this.maxAttempts) {
            this.gameOver = true;
            this.saveGameState();
            this.updateStatsAfterGame(false);
            setTimeout(() => this.endGame(false), 500);
        }
    }
    
    renderAttempts() {
        const container = document.getElementById('attemptsContainer');
        container.innerHTML = this.attempts.map((attempt, index) => {
            if (attempt.skipped) {
                return `
                    <div class="guess-row">
                        <div class="guess-location-name">Skipped</div>
                        <div class="guess-cells-container">
                            <div class="guess-cell absent">
                                <div class="cell-label">ATTEMPT #${index + 1}</div>
                                <div class="cell-value">Skipped ⏭</div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            const f = attempt.feedback;
            
            // Build tags display
            let tagsHTML = '';
            if (f.tags.common.length === 0 && f.tags.extra.length === 0) {
                tagsHTML = '<div class="cell-value">None</div>';
            } else {
                tagsHTML = '<div class="tags-container">';
                f.tags.common.forEach(tag => {
                    tagsHTML += `<span class="tag-chip tag-correct">✓ ${tag}</span>`;
                });
                f.tags.extra.forEach(tag => {
                    tagsHTML += `<span class="tag-chip tag-absent">${tag}</span>`;
                });
                tagsHTML += '</div>';
            }
            
            return `
                <div class="guess-row">
                    <div class="guess-location-name">${attempt.guess}</div>
                    <div class="guess-cells-container">
                        <div class="guess-cell ${f.game.status}">
                            <div class="cell-label">GAME</div>
                            <div class="cell-value">${f.game.value}</div>
                        </div>
                        <div class="guess-cell ${f.song.status}">
                            <div class="cell-label">SONG</div>
                            <div class="cell-value">${f.song.value}</div>
                        </div>
                        <div class="guess-cell ${f.tags.status}">
                            <div class="cell-label">TAGS</div>
                            ${tagsHTML}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    endGame(won = false) {
        // Stop any playing audio
        if (this.youtubePlayer) {
            this.youtubePlayer.pauseVideo();
        } else if (this.audioPlayer) {
            this.audioPlayer.pause();
        }
        this.stopProgressTracking();
        
        // Show game over modal
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const message = document.getElementById('gameOverMessage');
        const answer = document.getElementById('correctAnswer');
        
        title.textContent = won ? '🎉 You Win!' : '😔 Game Over';
        
        if (won) {
            message.textContent = `Amazing! You guessed it in ${this.attempts.length} ${this.attempts.length === 1 ? 'try' : 'tries'}!`;
        } else {
            message.textContent = 'Better luck next time!';
        }
        
        answer.textContent = `${this.currentSong.game} - ${this.currentSong.song}`;
        
        // Hide new game button in daily mode
        const newGameBtn = document.getElementById('newGameBtn');
        if (this.mode === 'daily') {
            newGameBtn.style.display = 'none';
        } else {
            newGameBtn.style.display = 'block';
        }
        
        this.showModal('gameOverModal');
    }
    
    shareResults() {
        const emoji = this.attempts.map(attempt => {
            if (attempt.skipped) return '⬜';
            if (attempt.correct) return '🟩';
            if (attempt.feedback && attempt.feedback.game.status === 'correct') return '🟨';
            if (attempt.feedback && attempt.feedback.tags.status === 'present') return '🟧';
            return '🟥';
        }).join('');
        
        const result = this.attempts.some(a => a.correct) ? 
            `${this.attempts.length}/${this.maxAttempts}` : 'X/6';
        
        const modeText = this.mode === 'daily' ? 
            `Packdle ${this.getDateString()}` : 'Packdle (Random)';
        
        const text = `${modeText}\n${result}\n\n${emoji}\n\nPlay at: https://umedmuzl.github.io/Packdle/`;
        
        if (navigator.share) {
            navigator.share({ text }).catch(() => {
                this.copyToClipboard(text);
            });
        } else {
            this.copyToClipboard(text);
        }
    }
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Success - silently copied
        }).catch(() => {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        });
    }
    
    updateStatsAfterGame(won) {
        const stats = this.getStats();
        
        stats.played++;
        
        if (won) {
            stats.won++;
            stats.currentStreak++;
            stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
        } else {
            stats.currentStreak = 0;
        }
        
        localStorage.setItem('packdle_stats', JSON.stringify(stats));
    }
    
    getStats() {
        const saved = localStorage.getItem('packdle_stats');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            played: 0,
            won: 0,
            currentStreak: 0,
            maxStreak: 0
        };
    }
    
    updateStats() {
        const stats = this.getStats();
        
        document.getElementById('gamesPlayed').textContent = stats.played;
        
        const winRate = stats.played > 0 ? 
            Math.round((stats.won / stats.played) * 100) : 0;
        document.getElementById('winRate').textContent = `${winRate}%`;
        
        document.getElementById('currentStreak').textContent = stats.currentStreak;
        document.getElementById('maxStreak').textContent = stats.maxStreak;
    }
    
    showModal(modalId) {
        document.getElementById(modalId).classList.add('show');
    }
    
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PackdleGame();
    });
} else {
    new PackdleGame();
}
