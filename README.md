# AgroDX - Plant Disease Detection System

AgroDX is a comprehensive plant disease detection system that combines image analysis, sensor data, and weather information to help farmers monitor and manage crop health.

## Features

- **Image-based Disease Detection**: Uses deep learning to identify plant diseases from images
- **Text-based Disease Detection**: Analyze disease symptoms using natural language processing
- **Field Management Dashboard**: Monitor multiple fields with real-time data
- **Sensor Integration**: Track environmental conditions with IoT sensors
- **Weather Integration**: Get weather data for each field location
- **Disease Alerts**: Receive notifications about potential disease outbreaks
- **Offline Mode**: Continue using the system without internet connection
- **Multi-language Support**: Available in multiple languages including Hindi

## Prerequisites

- Python 3.8 or higher
- PostgreSQL database
- Node.js and npm (for frontend development)
- Free API keys for:
  - OpenWeatherMap
  - Google Maps (optional)
  - Firebase (for authentication)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/agrodx.git
cd agrodx
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up the database:
```bash
createdb agrodx
```

5. Configure environment variables:
- Copy `.env.example` to `.env`
- Update the variables with your API keys and configuration

6. Initialize the database:
```bash
flask db upgrade
```

## Running the Application

1. Start the Flask development server:
```bash
flask run
```

2. Open your browser and navigate to `http://localhost:5000`

## Project Structure

```
agrodx/
├── app.py              # Main Flask application
├── config.py           # Configuration settings
├── models.py           # Database models
├── sensor_utils.py     # Sensor and weather utilities
├── dashboard.py        # Dashboard routes
├── main.py            # Core disease detection logic
├── llm.py             # Text-based detection
├── convert_model.py   # Model conversion utilities
├── static/            # Static files
│   ├── css/
│   ├── js/
│   └── uploads/
├── templates/         # HTML templates
├── input_folder/      # Temporary upload directory
└── requirements.txt   # Python dependencies
```

## Free/Low-Cost Components

- **Database**: PostgreSQL (free, open source)
- **Maps**: OpenStreetMap (free)
- **Weather**: OpenWeatherMap API (free tier)
- **Authentication**: Firebase Auth (free tier)
- **Hosting**: Railway/Render (free tier)
- **Storage**: Firebase Storage (free tier)
- **CI/CD**: GitHub Actions (free for public repos)

## Development

1. Install development dependencies:
```bash
pip install -r requirements-dev.txt
```

2. Run tests:
```bash
pytest
```

3. Format code:
```bash
black .
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Plant Village dataset for disease images
- TensorFlow.js for client-side model inference
- OpenStreetMap contributors for map data
- All contributors and maintainers

## Support

For support, please open an issue in the GitHub repository or contact the maintainers. 