# Plant Disease Detection System (AgroDx)

## Software Used (All Open Source)

| Software | Description | Open Source |
|----------|-------------|------------|
| **TensorFlow/TensorFlow.js** | Deep learning framework for model training and deployment | ✅ |
| **Flask** | Python web framework for backend server | ✅ |
| **Google Gemini API** | LLM for text-based disease detection | ❌ (Proprietary API) |
| **Firebase** | Authentication, storage, and database services | ❌ (Proprietary Service) |
| **Bootstrap 5** | CSS framework for responsive design | ✅ |
| **NumPy** | Scientific computing library for Python | ✅ |
| **TensorFlow.js Converter** | Tool to convert TensorFlow models to browser-compatible format | ✅ |
| **Google Translate API** | Translation services for multilingual support | ❌ (Proprietary API) |
| **Font Awesome** | Icon toolkit | ✅ (Free version) |
| **Pillow (PIL)** | Python Imaging Library for image processing | ✅ |

## Architecture/Block Diagram

```
+---------------------+     +-------------------------+     +------------------------+
|    User Interface   |     |    Web Server (Flask)   |     |   External Services    |
|   (HTML/CSS/JS)     |<--->|                         |<--->|                        |
+---------------------+     +-------------------------+     +------------------------+
        |                             |                              |
        v                             v                              v
+---------------------+     +-------------------------+     +------------------------+
|   Client-Side       |     |   Server-Side           |     |   Cloud Services       |
|   Components        |     |   Components            |     |                        |
|-------------------  |     |-------------------------|     |------------------------|
|- TensorFlow.js      |     |- TensorFlow Model       |     |- Firebase Auth         |
|- Offline Model      |     |- Image Processing       |     |- Firebase Storage      |
|- Image Analysis     |     |- Model Conversion       |     |- Google Gemini API     |
|- Authentication UI  |     |- File Management        |     |- Google Translate API  |
+---------------------+     +-------------------------+     +------------------------+
```

## Data Flow Diagram / Signal Flow Diagram

```
[1] User Uploads Image or Enters Symptoms
       |
       v
[2] MODE SELECTION
       |
       |--> [3A] ONLINE MODE                   [3B] OFFLINE MODE <--|
       |        |                                    |               |
       |        v                                    v               |
       |    [4A] Image sent to server          [4B] Model loaded    |
       |        |                                   from IndexedDB   |
       |        v                                    |               |
       |    [5A] Server processes              [5B] Browser runs    |
       |        with TensorFlow model               prediction      |
       |        |                                    |               |
       |        v                                    v               |
       |    [6A] Results returned             [6B] Results          |
       |        to browser                         displayed        |
       |        |                                    |               |
       |        v                                    v               |
       |--> [7] DISPLAY RESULTS                      |               |
                |                                    |               |
                |------------------------------------|               |
                v                                                    |
[8] (Optional) User can save results                                 |
    or share with community                                          |
                |                                                    |
                v                                                    |
[9] (First-time) Download model for offline use -------------------->|
```

## Features (Highlighted Keywords)

### Core Functionality
- **🔍 Image-Based Disease Detection**: Utilizes a pre-trained **deep learning model** to identify 38 different plant diseases from uploaded photos
- **💬 Text-Based Disease Detection**: Leverages **Google's Gemini API** to analyze user-described symptoms and provide potential diagnoses
- **🌐 Dual Operating Modes**:
  - **Online Mode**: Server-side predictions using the full TensorFlow model
  - **Offline Mode**: Client-side predictions using **TensorFlow.js** (no internet connection required)

### User Experience
- **🔄 Language Translation**: Integrated **Google Translate** with support for 17 languages including many Indian regional languages
- **📱 Responsive Design**: Mobile-friendly interface adapting to different screen sizes
- **👤 User Authentication**: Secure login and user management via **Firebase**
- **🖼️ Image Preview**: Visual confirmation of uploaded images before processing
- **📊 Confidence Display**: Shows prediction confidence levels for transparency

### Technical Innovations
- **💾 Model Storage**: Automatic saving of models in **IndexedDB** for persistent offline access
- **⚡ Model Conversion**: Automatic conversion from Keras (.h5) to TensorFlow.js format
- **🔄 Reset Capability**: Users can reset the model if issues arise
- **🗣️ Voice Input**: Speech recognition for text-based symptom description
- **🔐 Secure Communication**: Implements proper Content Security Policy (CSP)

### Additional Features
- **🔌 API Endpoints**: RESTful API for integration with other services
- **🌱 Multi-Crop Support**: Detection across various plant types (apple, tomato, potato, corn, etc.)
- **🏠 Local File Access**: Secure handling of user-uploaded images
- **📱 Progressive Web App** capabilities for installation on devices 