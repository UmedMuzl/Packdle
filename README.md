# Packdle 🎵

A Heardle-style music guessing game featuring DK64-converted songs from the [Candy's Shop](https://github.com/theballaam96/candys-shop) music library.

## Features

- **1,693 BGM Songs** - Curated from Candy's Shop collection
- **Daily Challenge** - One puzzle per day, same for everyone
- **Random Mode** - Unlimited random puzzles
- **Hybrid Audio Player** - Supports both YouTube and GitHub-hosted audio
- **Progressive Reveal** - 6 attempts with increasing playback time (1s → 2s → 4s → 7s → 11s → 16s)
- 📊 **Statistics Tracking** - Track your wins, streaks, and performance
- **Dark Theme** - Donkdle-inspired UI with Jumpman font

## How to Play

1. Listen to a short clip of a DK64-converted song
2. Type to search and guess the game and song name
3. Each wrong or skipped guess unlocks more of the song
4. Win by guessing correctly within 6 attempts!

## Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/Packdle.git
cd Packdle

# Start a local server
python3 -m http.server 8001

# Open http://localhost:8001 in your browser
```

## Data Source

All songs are sourced from the [Candy's Shop](https://theballaam96.github.io/PackBuilder/) DK64 music library. This project filters for BGM category entries and deduplicates to provide the latest versions of each song.

## Credits

- **Songs**: [theballaam96's Candy's Shop](https://theballaam96.github.io/PackBuilder/)
- **Font**: Jumpman.ttf
- **Inspired by**: Inspired by [Heardle](https://ninjigalaxy.github.io/mario-heardle/)

## License

See [LICENSE](LICENSE) file for details.
