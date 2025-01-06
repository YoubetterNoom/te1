# AI Twitter Bot

An intelligent Twitter bot powered by GPT-3.5 and multiple AI capabilities, including emotion recognition, personality learning, and image generation with Stable Diffusion.

![Bot Demo](docs/images/demo.gif)

## 🌟 Features

- 🤖 Advanced conversation powered by GPT-3.5
- 🎨 Image generation with Stable Diffusion and custom LoRA models
- 😊 Emotion recognition and adaptive responses
- 🧠 Personality learning and user preference adaptation
- 📸 Multi-modal interaction (text + image analysis)
- 📝 Context-aware conversations
- 🔄 Smart rate limiting
- 📊 User interest tracking and recommendations
- 📓 Conversation memory system

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Twitter Developer Account with API credentials
- OpenAI API key
- Stable Diffusion API (optional)

### Installation

1. Clone the repository:

2. Set up virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment:
```bash
cp .env.example .env
```

5. Edit `.env` with your credentials:
```env
# Twitter API Credentials
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Stable Diffusion API
SD_API_URL=http://your_sd_server:7860
SD_LORA_PATH=path_to_your_lora

# Character Settings
CHARACTER_NAME=Mika
CHARACTER_PERSONALITY="A cute and helpful AI assistant"
CHARACTER_PROMPT="You are Mika, a cute and helpful AI assistant..."
```

## 📁 Project Structure

```
twitter-ai-bot/
├── config/
│   ├── __init__.py
│   └── config.py          # Configuration management
├── handlers/
│   ├── __init__.py
│   ├── ai_handler.py      # Main AI logic
│   ├── emotion_handler.py # Emotion recognition
│   ├── image_handler.py   # Image generation
│   ├── memory_handler.py  # Conversation memory
│   └── multimodal_handler.py # Multi-modal processing
├── data/
│   ├── conversations/     # Stored conversations
│   ├── generated_images/  # Generated images
│   └── user_preferences/ # User settings
├── utils/
│   ├── logger.py         # Logging system
│   └── rate_limiter.py   # Request rate limiting
├── models/
│   └── user_preferences.py # User preference model
├── .env                  # Environment variables
├── .gitignore
├── bot.py               # Main bot script
└── requirements.txt
```

## 💡 Key Components

### Emotion Handler
```python
from handlers.emotion_handler import EmotionHandler

emotion_handler = EmotionHandler()
emotion = emotion_handler.analyze_emotion("I'm so happy today!")
# Returns emotion analysis with confidence scores
```

### Image Generation
```python
from handlers.image_handler import ImageGenerator

generator = ImageGenerator()
image_path = generator.generate_image("A cute anime character")
```

### Context Management
```python
from handlers.context_handler import ContextHandler

context = ContextHandler()
topic = context_handler.get_current_topic()
```

## 🤖 Bot Commands

- `@bot_name hello` - Start a conversation
- `@bot_name draw [prompt]` - Generate an image
- `@bot_name help` - Show command list
- `@bot_name stats` - Show interaction statistics

## 🛠 Advanced Configuration

### Customizing Character Personality

Edit the CHARACTER_PROMPT in `.env` to modify the bot's personality:

```env
CHARACTER_PROMPT="You are a helpful AI assistant with a focus on technology and programming..."
```

### Rate Limiting

Default limits:
- 300 tweets per 3 hours
- 30 images per hour

Modify in `utils/rate_limiter.py`:

```python
self.limits = {
    'tweets': {'count': 300, 'window': 180},
    'images': {'count': 30, 'window': 60}
}
```

## 📊 Features in Detail

### Emotion Recognition
- Uses DistilRoBERTa model
- Recognizes: joy, sadness, anger, fear, love
- Adjusts responses based on emotional context

### Personality Learning
- Tracks user interactions
- Learns preferred topics
- Adapts conversation style

### Image Generation
- Stable Diffusion integration
- Custom LoRA model support
- Style consistency

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgments

- OpenAI for GPT-3.5
- Hugging Face for Transformers
- Stable Diffusion community
- Twitter API team

## 📫 Contact

Your Name - [@your_twitter](https://twitter.com/your_twitter)

Project Link: [https://github.com/yourusername/twitter-ai-bot](https://github.com/yourusername/twitter-ai-bot)

## 🔮 Future Plans

- Voice interaction support
- Multi-language emotion analysis
- Advanced knowledge graph integration
- Real-time learning system
- Web dashboard for management
```

