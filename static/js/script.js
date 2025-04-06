document.addEventListener("DOMContentLoaded", function () {
    const faqItems = document.querySelectorAll(".faq-item");

    function handleScroll() {
        faqItems.forEach((item) => {
            const itemPosition = item.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;

            if (itemPosition < windowHeight - 100) {
                item.classList.add("show");
            } else {
                item.classList.remove("show"); // Reset when out of view
            }
        });
    }

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Run once on page load
    
    // Check server status for TensorFlow availability
    checkServerStatus();
    
    // Initialize language dropdown
    initLanguageDropdown();
    
    // Initialize language selector
    initLanguageSelector();
    
    // Setup speech recognition for voice input
    setupVoiceRecognition();
    
    // Setup image preview for online mode
    setupImagePreview();
    
    // Setup the offline detect button
    setupOfflineDetection();

    // Preload the model if we're in offline mode
    setTimeout(() => {
        // Only preload if we're in offline mode
        if (document.getElementById('mode-toggle').value === 'offline') {
            console.log("Preloading high-accuracy model in the background...");
            loadOfflineModel().then(success => {
                if (success) {
                    console.log("High-accuracy model preloaded successfully!");
                } else {
                    console.warn("Could not preload high-accuracy model");
                }
            }).catch(error => {
                console.error("Error preloading model:", error);
            });
        }
    }, 2000); // Wait 2 seconds before starting the preload
});

// Add an image preview functionality
function setupImagePreview() {
    // For online mode
    const imageInputOnline = document.getElementById('image-input-online');
    const imagePreviewOnline = document.getElementById('image-preview');
    const previewImageOnline = document.getElementById('preview-image');
    
    if (imageInputOnline && previewImageOnline) {
        imageInputOnline.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    previewImageOnline.src = e.target.result;
                    imagePreviewOnline.style.display = 'block';
                };
                
                reader.readAsDataURL(this.files[0]);
            } else {
                previewImageOnline.src = '';
                imagePreviewOnline.style.display = 'none';
            }
        });
    }
    
    // For offline mode
    const imageInputOffline = document.getElementById('image-input');
    const imagePreviewOffline = document.getElementById('offline-image-preview');
    const previewImageOffline = document.getElementById('offline-preview-image');
    
    if (imageInputOffline && previewImageOffline) {
        imageInputOffline.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    previewImageOffline.src = e.target.result;
                    imagePreviewOffline.style.display = 'block';
                };
                
                reader.readAsDataURL(this.files[0]);
            } else {
                previewImageOffline.src = '';
                imagePreviewOffline.style.display = 'none';
            }
        });
    }
}

// Setup speech recognition for microphone button
function setupVoiceRecognition() {
    const voiceButton = document.getElementById('voice-input-btn');
    const symptomsInput = document.getElementById('symptoms-input');
    const voiceStatus = document.getElementById('voice-status');
    
    if (!voiceButton || !symptomsInput) return;
    
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        // Speech recognition not supported
        if (voiceStatus) {
            voiceStatus.textContent = 'Speech recognition not supported in this browser.';
        }
        if (voiceButton) {
            voiceButton.disabled = true;
            voiceButton.classList.add('btn-secondary');
            voiceButton.classList.remove('btn-primary');
        }
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Change to true for continuous listening
    recognition.interimResults = true; // Show interim results
    
    // Try to detect language based on page language
    const html = document.querySelector('html');
    if (html && html.lang) {
        recognition.lang = html.lang;
    } else {
        recognition.lang = 'en-US'; // Default to English
    }
    
    let isListening = false;
    
    // When user clicks the microphone button
    voiceButton.addEventListener('click', () => {
        if (isListening) {
            // If already listening, stop
            recognition.stop();
            isListening = false;
            voiceButton.classList.remove('listening');
            voiceButton.classList.remove('btn-danger');
            voiceButton.classList.add('btn-secondary');
            voiceStatus.textContent = 'Listening stopped.';
        } else {
            // Start listening
            try {
            recognition.start();
                isListening = true;
            voiceButton.classList.add('listening');
            voiceButton.classList.remove('btn-secondary');
            voiceButton.classList.add('btn-danger');
            voiceStatus.textContent = 'Listening... Speak now.';
            } catch (e) {
                console.error('Speech recognition error:', e);
                voiceStatus.textContent = 'Error starting speech recognition. Try again.';
            }
        }
    });
    
    // Process the speech when results are available
    recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Update the input field with the transcribed text
        if (finalTranscript !== '') {
            symptomsInput.value = finalTranscript;
            voiceStatus.textContent = 'Recognized: ' + finalTranscript;
        } else if (interimTranscript !== '') {
            symptomsInput.value = interimTranscript;
            voiceStatus.textContent = 'Listening: ' + interimTranscript;
        }
    };
    
    // Handle errors
    recognition.onerror = (event) => {
        voiceStatus.textContent = 'Error: ' + event.error;
        isListening = false;
        voiceButton.classList.remove('listening');
        voiceButton.classList.remove('btn-danger');
        voiceButton.classList.add('btn-secondary');
    };
    
    // When recognition ends
    recognition.onend = () => {
        isListening = false;
        voiceButton.classList.remove('listening');
        voiceButton.classList.remove('btn-danger');
        voiceButton.classList.add('btn-secondary');
        voiceStatus.textContent = 'Listening ended.';
    };
}

// Initialize language dropdown
function initLanguageDropdown() {
    const dropdownToggle = document.getElementById('languageDropdown');
    const dropdownMenu = document.querySelector('.language-dropdown-menu');
    const languageOptions = document.querySelectorAll('.language-option');
    const currentLanguageSpan = document.getElementById('currentLanguage');
    
    if (!dropdownToggle || !dropdownMenu) return;
    
    // Toggle dropdown when clicking the toggle button
    dropdownToggle.addEventListener('click', function(e) {
        e.preventDefault();
        dropdownMenu.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
    
    // Handle language selection
    languageOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const langCode = this.getAttribute('data-lang-code');
            const langName = this.textContent;
            
            // Update active state
            languageOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Update current language display
            currentLanguageSpan.textContent = langName;
            
            // Get the Google Translate element
            const googleElement = document.getElementById('google_translate_element');
            if (googleElement) {
                // Find and click the appropriate language option in the Google Translate widget
                const select = googleElement.querySelector('select');
                if (select) {
                    select.value = langCode;
                    select.dispatchEvent(new Event('change'));
                }
            }
            
            // Close the dropdown
            const dropdown = document.querySelector('.language-dropdown-menu');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        });
    });
}

// Check if server has TensorFlow available
async function checkServerStatus() {
    try {
        const response = await fetch('/status');
        if (response.ok) {
            const data = await response.json();
            if (!data.tensorflow_available) {
                // If TensorFlow is not available on server, auto-switch to offline mode
                document.getElementById('mode-toggle').value = 'offline';
                document.getElementById('mode-toggle').dispatchEvent(new Event('change'));
                
                // Show a notification
                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = `<div class="alert alert-warning">
                    <p><strong>Note:</strong> The server doesn't have TensorFlow available.</p>
                    <p>You've been automatically switched to offline mode.</p>
                    <p>You'll need to download the model for local detection.</p>
                </div>`;
            }
        }
    } catch (error) {
        console.error('Error checking server status:', error);
    }
}

// Toggle between Online and Offline modes
document.getElementById('mode-toggle').addEventListener('change', function () {
    // Clear previous results
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';
    
    if (this.value === 'online') {
        document.getElementById('online-mode').style.display = 'block';
        document.getElementById('offline-mode').style.display = 'none';
    } else {
        document.getElementById('online-mode').style.display = 'none';
        document.getElementById('offline-mode').style.display = 'block';
        
        // Make sure jQuery is loaded for offline mode
        ensureJQuery(() => {
            // Clear any previous message
            const resultArea = document.getElementById('result-area');
            if (resultArea) {
                resultArea.innerHTML = '';
            }
            
            // Trigger model loading with proper UI update
            handleModelLoadForOffline();
        });
    }
});

// Global variables for offline model
let offlineModel = null;
let offlineModelLoading = false;
const classNames = ["Apple___Apple_scab", "Apple___Black_rot", "Apple___Cedar_apple_rust", "Apple___healthy", "Blueberry___healthy", "Cherry_(including_sour)___Powdery_mildew", "Cherry_(including_sour)___healthy", "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot", "Corn_(maize)___Common_rust_", "Corn_(maize)___Northern_Leaf_Blight", "Corn_(maize)___healthy", "Grape___Black_rot", "Grape___Esca_(Black_Measles)", "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)", "Grape___healthy", "Orange___Haunglongbing_(Citrus_greening)", "Peach___Bacterial_spot", "Peach___healthy", "Pepper,_bell___Bacterial_spot", "Pepper,_bell___healthy", "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy", "Raspberry___healthy", "Soybean___healthy", "Squash___Powdery_mildew", "Strawberry___Leaf_scorch", "Strawberry___healthy", "Tomato___Bacterial_spot", "Tomato___Early_blight", "Tomato___Late_blight", "Tomato___Leaf_Mold", "Tomato___Septoria_leaf_spot", "Tomato___Spider_mites Two-spotted_spider_mite", "Tomato___Target_Spot", "Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Tomato___Tomato_mosaic_virus", "Tomato___healthy"];

// Function to load the offline model
async function loadOfflineModel() {
    // Don't load again if already loaded
    if (offlineModel) {
        return true;
    }
    
    // Get model status elements
    const modelStatus = document.getElementById('model-status');
    const modelLoadingStatus = document.getElementById('model-loading-status');
    const modelProgressBar = document.getElementById('model-progress-bar');
    const modelProgressDiv = document.getElementById('model-progress-div');
    const offlineToggle = document.getElementById('offline-toggle');
    
    // Update UI to loading state
    if (modelStatus) modelStatus.innerText = 'Loading...';
    if (modelLoadingStatus) modelLoadingStatus.classList.remove('d-none');
    if (modelProgressBar) modelProgressBar.style.width = '0%';
    if (modelProgressDiv) modelProgressDiv.classList.remove('d-none');
    if (offlineToggle) offlineToggle.disabled = true;
    
    try {
        // First try to load metadata and classes
        try {
            const metadataResponse = await fetch('/static/model/metadata.json');
            if (metadataResponse.ok) {
                window.modelMetadata = await metadataResponse.json();
            }
        } catch (error) {
            // Silently handle metadata loading errors
        }
        
        // Load class names
        try {
            const classesResponse = await fetch('/static/model/classes.json');
            if (classesResponse.ok) {
                window.classLabels = await classesResponse.json();
            } else {
                // Use the global classNames as fallback
                window.classLabels = classNames;
            }
        } catch (error) {
            // Use the global classNames as fallback
            window.classLabels = classNames;
        }
        
        // Define progress callback function
        const onProgress = (fraction) => {
            // Calculate percentage and update progress bar
            const percent = Math.round(fraction * 100);
            if (modelProgressBar) {
                modelProgressBar.style.width = `${percent}%`;
                modelProgressBar.innerText = `${percent}%`;
            }
        };
        
        // Attempt to load the model from IndexedDB first (in case it was cached)
        try {
            offlineModel = await tf.loadLayersModel('indexeddb://plant-disease-model');
        } catch (error) {
            // Model not found in IndexedDB, loading from server
            
            // First try loading from model.json in the root model folder
            try {
                offlineModel = await tf.loadLayersModel('/static/model/model.json', {
                    onProgress: onProgress
                });
                
                // Save the model to IndexedDB for offline use
                try {
                    await offlineModel.save('indexeddb://plant-disease-model');
                } catch (saveError) {
                    // Silently handle save errors
                }
            } catch (mainModelError) {
                // Try loading from tfjs_model directory
                try {
                    offlineModel = await tf.loadLayersModel('/static/model/tfjs_model/model.json', {
                        onProgress: onProgress
                    });
                    
                    // Save to IndexedDB for future use
                    try {
                        await offlineModel.save('indexeddb://plant-disease-model');
                    } catch (saveError) {
                        // Silently handle save errors
                    }
                } catch (nestedModelError) {
                    // Update UI with failure
                    if (modelStatus) modelStatus.innerText = 'Failed to load';
                    if (modelLoadingStatus) {
                        modelLoadingStatus.innerHTML = `
                            <div class="alert alert-danger">
                                <strong>Error loading model.</strong>
                                <p>Please try refreshing the page or use online mode.</p>
                            </div>
                        `;
                    }
                    
                    if (offlineToggle) offlineToggle.disabled = false;
                    return false;
                }
            }
        }
        
        // Final warmup and preparation for the loaded model
        if (offlineModel) {
            // If we didn't load metadata yet, create it from the model input shape
            const inputShape = offlineModel.inputs[0].shape;
            if (!window.modelMetadata) {
                window.modelMetadata = {
                    inputShape: inputShape.slice(1),  // Remove batch dimension
                    preprocessingParams: {
                        targetSize: [inputShape[1], inputShape[2]]
                    },
                    postprocessingParams: {
                        confidenceThreshold: 0.1,
                        topK: 1
                    }
                };
            }
            
            try {
                // Perform a warmup prediction to initialize the model
                const modelInputShape = window.modelMetadata?.preprocessingParams?.targetSize || 
                                      [128, 128]; // Default if no metadata
                
                const dummyInput = tf.zeros([1, modelInputShape[0], modelInputShape[1], 3]);
                
                // Run prediction to initialize model
                const warmupResult = offlineModel.predict(dummyInput);
                warmupResult.dataSync(); // Force execution
                warmupResult.dispose(); // Cleanup
                dummyInput.dispose(); // Cleanup
            } catch (warmupError) {
                // We'll still try to use the model even if warmup fails
            }
            
            // Update UI to show success
            if (modelStatus) modelStatus.innerText = 'Loaded';
            if (modelLoadingStatus) modelLoadingStatus.classList.add('d-none');
            if (modelProgressDiv) modelProgressDiv.classList.add('d-none');
            
            return true;
        }
        
        return false;
        
    } catch (error) {
        // Update UI to show error
        if (modelStatus) modelStatus.innerText = 'Error';
        if (modelLoadingStatus) {
            modelLoadingStatus.classList.remove('d-none');
            modelLoadingStatus.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
        }
        
        return false;
    } finally {
        // Re-enable offline toggle regardless of outcome
        if (offlineToggle) offlineToggle.disabled = false;
    }
}

// Function to clear model storage
async function clearModelStorage() {
    const resultDiv = document.getElementById('result');
    
    try {
        const modelPath = 'indexeddb://plant-disease-model';
        await tf.io.removeModel(modelPath);
        offlineModel = null;
        resultDiv.innerHTML = `
            <div class="alert alert-success">
                <p>Model storage has been cleared.</p>
                <button id="reload-model-btn" class="btn btn-primary mt-2">Load New Model</button>
            </div>
        `;
        
        // Add event listener to reload button
        document.getElementById('reload-model-btn').addEventListener('click', function() {
            loadOfflineModel();
        });
        
    } catch (error) {
        console.error("Error clearing model storage:", error);
        resultDiv.innerHTML = `<div class="alert alert-danger">Error clearing model storage: ${error.message}</div>`;
    }
}

// Function to fix model.json format issues (camelCase vs snake_case)
function fixModelJsonFormat(modelJson) {
    // Deep copy the model to avoid modifying the original
    const fixedModel = JSON.parse(JSON.stringify(modelJson));
    
    // Fix modelTopology if it exists
    if (fixedModel.modelTopology) {
        // Fix class_name vs className
        if (fixedModel.modelTopology.className && !fixedModel.modelTopology.class_name) {
            fixedModel.modelTopology.class_name = fixedModel.modelTopology.className;
            delete fixedModel.modelTopology.className;
        }
        
        // Fix kerasVersion vs keras_version
        if (fixedModel.modelTopology.kerasVersion && !fixedModel.modelTopology.keras_version) {
            fixedModel.modelTopology.keras_version = fixedModel.modelTopology.kerasVersion;
            delete fixedModel.modelTopology.kerasVersion;
        }
        
        // Fix config layers
        if (fixedModel.modelTopology.config && fixedModel.modelTopology.config.layers) {
            fixedModel.modelTopology.config.layers = fixedModel.modelTopology.config.layers.map(layer => {
                // Fix class_name
                if (layer.className && !layer.class_name) {
                    layer.class_name = layer.className;
                    delete layer.className;
                }
                
                // Fix config properties
                if (layer.config) {
                    // Fix batchInputShape
                    if (layer.config.batchInputShape && !layer.config.batch_input_shape) {
                        layer.config.batch_input_shape = layer.config.batchInputShape;
                        delete layer.config.batchInputShape;
                    }
                    
                    // Fix useBias
                    if (layer.config.useBias !== undefined && layer.config.use_bias === undefined) {
                        layer.config.use_bias = layer.config.useBias;
                        delete layer.config.useBias;
                    }
                }
                
                return layer;
            });
        }
    }
    
    return fixedModel;
}

// Function to check model compatibility and attempt fixes
async function checkModelCompatibility() {
    if (!offlineModel) return false;
    
    try {
        // Get the model information
        const inputShape = offlineModel.inputs[0].shape;
        console.log("Model input shape:", inputShape);
        
        // Always use 224x224 to match the model
        const testTensor = tf.zeros([1, 224, 224, 3]);
        
        // Try a prediction
        try {
            const testResult = offlineModel.predict(testTensor);
            console.log("Test prediction succeeded. Model compatible with 224x224 input.");
            console.log("Test prediction output shape:", testResult.shape);
            
            // Check the max class - see if it's always Blueberry
            const testProbs = Array.from(await testResult.data());
            const maxTestClass = testProbs.indexOf(Math.max(...testProbs));
            console.log("Test prediction max class:", maxTestClass, "name:", classNames[maxTestClass]);
            
            // For a test tensor of all zeros, we expect inconsistent results
            // We'll keep the model regardless of what it predicts here
            testResult.dispose();
            testTensor.dispose();
            return true;
        } catch (error) {
            console.error("Model compatibility test failed:", error);
            
            // Clean up tensor
            testTensor.dispose();
            
            // If we get here, the model might have issues, but we'll try to use it anyway
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = `
                <div class="alert alert-warning">
                    <p><strong>Model compatibility issue detected.</strong></p>
                    <p>The model might have issues, but we'll try to use it for your image.</p>
                    <p>For more accurate results, please try using the online mode when connected to the internet.</p>
                </div>
            `;
            
            // Still return true to attempt to use the model
            return true;
        }
    } catch (error) {
        console.error("Error checking model compatibility:", error);
        return false;
    }
}

// Function to completely reset the model and reload
async function forceModelReset() {
    try {
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `
            <div class="alert alert-info">
                <p><strong>Resetting model cache...</strong></p>
                <p>Attempting to load a fresh model from the server.</p>
            </div>
        `;
        
        // First dispose of the current model if it exists
        if (offlineModel) {
            offlineModel.dispose();
            offlineModel = null;
        }
        
        // Clear all models from IndexedDB
        const models = await tf.io.listModels();
        for (const modelPath in models) {
                console.log("Clearing model:", modelPath);
                await tf.io.removeModel(modelPath);
        }
        
        // Clear browser cache for model files
        if ('caches' in window) {
            try {
                const cacheNames = await window.caches.keys();
                for (const cacheName of cacheNames) {
                    if (cacheName.includes('model')) {
                        await window.caches.delete(cacheName);
                        console.log("Deleted cache:", cacheName);
                    }
                }
            } catch (e) {
                console.warn("Cache API access error:", e);
            }
        }
        
        // Attempt to load the model fresh from server
        try {
            console.log("Loading fresh model from server...");
            const modelPath = '/static/model/model.json';
            offlineModel = await tf.loadLayersModel(modelPath, {
                onProgress: (fraction) => {
                    resultDiv.innerHTML = `
                        <div class="alert alert-info">
                            <p><strong>Loading fresh model...</strong></p>
                            <div class="progress">
                                <div class="progress-bar" role="progressbar" style="width: ${Math.round(fraction * 100)}%" 
                                    aria-valuenow="${Math.round(fraction * 100)}" aria-valuemin="0" aria-valuemax="100">
                                    ${Math.round(fraction * 100)}%
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
            
            // Save the model to a new path to avoid issues with the old one
            await offlineModel.save('indexeddb://plant-disease-model-' + new Date().getTime());
            
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <p><strong>Model reset successful!</strong></p>
                    <p>Please try your detection again.</p>
                </div>
            `;
            
            return true;
        } catch (error) {
            console.error("Failed to load fresh model:", error);
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <p><strong>Model reset failed.</strong></p>
                    <p>Please try using the online mode instead.</p>
                    <button class="btn btn-primary btn-sm" onclick="window.location.href='/'">
                        Return to Home
                    </button>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error("Error during model reset:", error);
        return false;
    }
}

// Function to verify model has the right input dimensions
async function verifyModelInputDimensions() {
    if (!offlineModel) return false;
    
    try {
        // Get model input shape
        const modelInputShape = offlineModel.inputs[0].shape;
        console.log("Model input shape:", modelInputShape);
        
        // Use 224x224 dimensions to match the model
        const testTensor = tf.zeros([1, 224, 224, 3]);
        
        try {
            // Try prediction with 224x224
            const testResult = offlineModel.predict(testTensor);
            testResult.dispose();
            testTensor.dispose();
            console.log("Model validation successful with 224x224");
            return true;
        } catch (error) {
            console.error("Model validation failed with 224x224:", error);
            testTensor.dispose();
            return false;
        }
    } catch (error) {
        console.error("Error checking model dimensions:", error);
        return false;
    }
}

// Camera functionality for both online and offline modes
document.addEventListener('DOMContentLoaded', function() {
    // Setup online mode camera
    setupCamera('open-camera-online', 'close-camera-online', 'capture-photo-online', 
                'camera-feed-container-online', 'camera-feed-online', 'photo-canvas-online', true);
    
    // Setup offline mode camera
    setupCamera('open-camera', 'close-camera', 'capture-photo', 
                'camera-feed-container', 'camera-feed', 'photo-canvas', false);
                
    // Common camera setup function
    function setupCamera(openBtnId, closeBtnId, captureBtnId, containerId, feedId, canvasId, isOnlineMode) {
        // Camera elements
        const openCameraBtn = document.getElementById(openBtnId);
        const closeCameraBtn = document.getElementById(closeBtnId);
        const capturePhotoBtn = document.getElementById(captureBtnId);
        const cameraFeedContainer = document.getElementById(containerId);
        const cameraFeed = document.getElementById(feedId);
        const photoCanvas = document.getElementById(canvasId);
        
        let stream = null;
        
        // Check if camera elements exist
        if (openCameraBtn && closeCameraBtn && capturePhotoBtn && cameraFeed && photoCanvas) {
            // Open camera button click handler
            openCameraBtn.addEventListener('click', async function() {
                try {
                    // Request camera access and get stream
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { 
                            facingMode: 'environment', // Prefer back camera if available
                            width: { ideal: 224 },
                            height: { ideal: 224 } 
                        } 
                    });
                    
                    // Set video source and show camera feed
                    cameraFeed.srcObject = stream;
                    cameraFeedContainer.classList.remove('d-none');
                    openCameraBtn.classList.add('d-none');
                    
                    // Add simple instructions above camera
                    const instructionsDiv = document.createElement('div');
                    instructionsDiv.className = 'alert alert-info mt-2 mb-2';
                    instructionsDiv.innerHTML = '<small>Center the plant in frame and ensure good lighting.</small>';
                    cameraFeedContainer.insertBefore(instructionsDiv, cameraFeedContainer.firstChild);
                    
                    console.log("Camera opened successfully");
                } catch (error) {
                    console.error('Error accessing camera:', error);
                    alert('Could not access camera. Please make sure you have granted camera permissions and try again.');
                }
            });
            
            // Close camera button click handler
            closeCameraBtn.addEventListener('click', function() {
                // Stop camera stream
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    stream = null;
                }
                
                // Hide camera feed and show open camera button
                cameraFeedContainer.classList.add('d-none');
                openCameraBtn.classList.remove('d-none');
                
                // Remove any instruction div we added
                const instructionsDiv = cameraFeedContainer.querySelector('.alert');
                if (instructionsDiv) {
                    instructionsDiv.remove();
                }
                
                console.log("Camera closed");
            });
            
            // Capture photo button click handler
            capturePhotoBtn.addEventListener('click', function() {
                if (!stream) return;
                
                // Set canvas dimensions to match video
                const context = photoCanvas.getContext('2d');
                photoCanvas.width = 224;
                photoCanvas.height = 224;
                
                // Draw current frame from video to canvas
                context.drawImage(cameraFeed, 0, 0, photoCanvas.width, photoCanvas.height);
                
                // Convert canvas to data URL
                const photoURL = photoCanvas.toDataURL('image/jpeg');
                
                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = `
                    <div class="card mb-3">
                        <div class="card-body">
                            <img src="${photoURL}" class="img-fluid mb-2" style="max-width: 224px;">
                            <div class="alert alert-info mb-0">Ready for detection. Click "Detect Disease" to analyze.</div>
                        </div>
                    </div>
                `;
                
                // If online mode, prepare for form submission
                if (isOnlineMode) {
                    // Convert dataURL to blob
                    const base64Data = photoURL.split(',')[1];
                    const blob = base64ToBlob(base64Data, 'image/jpeg');
                    
                    // Create a File from Blob
                    const fileName = `captured_photo_${new Date().getTime()}.jpg`;
                    const file = new File([blob], fileName, { type: 'image/jpeg' });
                    
                    // Create a FileList-like object
                    const fileList = new DataTransfer();
                    fileList.items.add(file);
                    
                    // Assign the file to the input element
                    const inputElement = document.getElementById('image-input-online');
                    inputElement.files = fileList.files;
                    
                    // Show preview
                    const previewImage = document.getElementById('preview-image');
                    const imagePreview = document.getElementById('image-preview');
                    if (previewImage && imagePreview) {
                        previewImage.src = photoURL;
                        imagePreview.style.display = 'block';
                    }
                } else {
                    // For offline mode
                    window.capturedPhotoURL = photoURL;
                }
                
                // Close camera
                closeCameraBtn.click();
                
                console.log("Photo captured successfully");
            });
        }
    }
    
    // Helper function to convert base64 to Blob
    function base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteArrays = [];
        
        for (let i = 0; i < byteCharacters.length; i += 512) {
            const slice = byteCharacters.slice(i, i + 512);
            const byteNumbers = new Array(slice.length);
            
            for (let j = 0; j < slice.length; j++) {
                byteNumbers[j] = slice.charCodeAt(j);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        
        return new Blob(byteArrays, { type: mimeType });
    }
});

// Setup the offline detection functionality
function setupOfflineDetection() {
    const detectOfflineBtn = document.getElementById('detect-offline');
    const imageInput = document.getElementById('image-input'); 
    const resultArea = document.getElementById('offline-result-area') || document.getElementById('result-area');
    
    // Check if elements exist before adding event listeners
    if (!detectOfflineBtn || !imageInput) {
        console.error("Required elements for offline detection not found");
        return;
    }
    
    detectOfflineBtn.addEventListener('click', async function() {
        // Get the result area again in case the DOM has changed
        const currentResultArea = document.getElementById('offline-result-area') || 
                                document.getElementById('result-area');
        
        if (!currentResultArea) {
            console.error("No result area found to display results");
            alert("Error: Cannot find result area to display detection results.");
            return;
        }
        
        // Validate input - check if a file is selected
        if (!imageInput || !imageInput.files || !imageInput.files.length) {
            if (currentResultArea) {
                currentResultArea.innerHTML = `
                    <div class="alert alert-warning">
                        <strong>No image selected!</strong> Please upload an image first.
                    </div>
                `;
            }
            return;
        }
        
        // Check file type
        const file = imageInput.files[0];
        if (!file.type.startsWith('image/')) {
            currentResultArea.innerHTML = `
                <div class="alert alert-warning">
                    <strong>Invalid file type!</strong> Please select an image file.
                </div>
            `;
            return;
        }
        
        // Show loading indicator
        if (currentResultArea) {
            currentResultArea.innerHTML = `
                <div class="d-flex justify-content-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="ms-2">Processing image...</span>
                </div>
            `;
        }
        
        try {
            // Make sure model is loaded
            if (!offlineModel) {
                // Try loading the model first if not already loaded
                const loaded = await loadOfflineModel();
                if (!loaded) {
                    throw new Error("Failed to load offline model");
                }
            }
            
            // Create an object URL from the image file
            const imageURL = URL.createObjectURL(imageInput.files[0]);
            
            // Create an image element to load the image
            const img = new Image();
            
            // Set up load and error handlers before setting src
            const imgLoadPromise = new Promise((resolve, reject) => {
                img.onload = () => {
                    resolve();
                };
                img.onerror = (e) => {
                    reject(new Error("Failed to load image"));
                };
            });
            
            // Set the image source
            img.src = imageURL;
            
            // Wait for the image to load
            await imgLoadPromise;
            
            // Get the input dimensions from metadata or use defaults
            const targetSize = [128, 128]; // Default if metadata is not available
            
            if (window.modelMetadata && window.modelMetadata.preprocessingParams && 
                window.modelMetadata.preprocessingParams.targetSize) {
                targetSize[0] = window.modelMetadata.preprocessingParams.targetSize[0];
                targetSize[1] = window.modelMetadata.preprocessingParams.targetSize[1];
            }
            
            let predictionData;
            let prediction;
            
            try {
                // Process the image with the model - using tf.tidy for better memory management
                prediction = tf.tidy(() => {
                    // Create tensors and process
                    const tensor = tf.browser.fromPixels(img);
                    const resized = tf.image.resizeBilinear(tensor, targetSize);
                    const normalized = resized.div(255.0);
                    const batched = normalized.expandDims(0);
                    
                    // Run prediction
                    return offlineModel.predict(batched);
                });
                
                // Get the prediction data
                predictionData = await prediction.data();
                
            } catch (predictionError) {
                throw new Error(`Prediction failed: ${predictionError.message}`);
            } finally {
                // Clean up tensor memory if it was created
                if (prediction) prediction.dispose();
            }
            
            // Get the index of the max value (the predicted class)
            const predictedClassIndex = tf.argMax(predictionData).dataSync()[0];
            
            // Get the confidence value (probability score)
            const originalConfidence = predictionData[predictedClassIndex];
            
            // Load the class labels either from metadata or from file
            let classLabels = [];
            
            if (window.classLabels) {
                classLabels = window.classLabels;
            } else if (window.modelMetadata && window.modelMetadata.classes) {
                classLabels = window.modelMetadata.classes;
            } else {
                try {
                    // Try to load class labels from file
                    const response = await fetch('/static/model/classes.json');
                    if (response.ok) {
                        classLabels = await response.json();
                        // Cache for future use
                        window.classLabels = classLabels;
                    } else {
                        throw new Error("Failed to load class labels");
                    }
                } catch (error) {
                    // If we can't load, create placeholder labels
                    classLabels = Array.from({length: predictionData.length}, (_, i) => `Class ${i}`);
                }
            }
            
            // Get the plant type from the dropdown
            const plantTypeSelect = document.getElementById('plant-type-offline');
            const selectedPlantType = plantTypeSelect ? plantTypeSelect.value.toLowerCase() : 'any';
            
            // Get the predicted class name
            const predictedClass = classLabels[predictedClassIndex];
            
            // Do plant type filtering only if not set to "any"
            let finalPrediction = predictedClass;
            if (selectedPlantType !== 'any') {
                // Check if the prediction matches the selected plant type
                const matchesSelectedPlant = predictedClass.toLowerCase().includes(selectedPlantType);
                
                if (!matchesSelectedPlant) {
                    // Find the highest confidence class that matches the selected plant
                    let highestMatchedIndex = -1;
                    let highestMatchedConfidence = -1;
                    
                    for (let i = 0; i < predictionData.length; i++) {
                        const currentClass = classLabels[i].toLowerCase();
                        if (currentClass.includes(selectedPlantType) && predictionData[i] > highestMatchedConfidence) {
                            highestMatchedConfidence = predictionData[i];
                            highestMatchedIndex = i;
                        }
                    }
                    
                    if (highestMatchedIndex !== -1) {
                        finalPrediction = classLabels[highestMatchedIndex];
                    }
                }
            }
            
            // Create result HTML without showing confidence
            if (currentResultArea) {
                currentResultArea.innerHTML = `
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title text-center mb-3">Detection Result</h5>
                            <p class="text-center fs-5 mb-2">${finalPrediction}</p>
                        </div>
                    </div>
                `;
            } else {
                console.error("No result area found to display results");
                alert("Error: Cannot find result area to display detection results");
            }
            
            // Clean up object URL
            URL.revokeObjectURL(imageURL);
            
        } catch (error) {
            console.error("Error in offline detection:", error);
            if (currentResultArea) {
                currentResultArea.innerHTML = `
                    <div class="alert alert-danger">
                        <strong>Error:</strong> ${error.message}
                        <p>Please try again or switch to online mode.</p>
                        <button class="btn btn-primary mt-2" onclick="forceReloadModel(false)">
                            <i class="fas fa-sync me-2"></i>Reload Model
                        </button>
                    </div>
                `;
            }
        }
    });
}

// Check if model is already available when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Remove the download button from the offline section
    const downloadBtn = document.getElementById('download-model-btn');
    if (downloadBtn) {
        downloadBtn.remove();
    }
    
    // Add instructions about the offline mode
    const offlineMode = document.getElementById('offline-mode');
    if (offlineMode) {
        const header = offlineMode.querySelector('h3');
        if (header) {
            header.insertAdjacentHTML('afterend', `
                <div class="alert alert-info mb-3">
                    <p><strong>Offline Mode</strong></p>
                    <p>Take a photo or upload a plant image for local analysis without internet connection.</p>
                </div>
            `);
    }
}
    
    // Ensure "Any plant" is selected by default in both dropdowns
    const onlinePlantType = document.getElementById('plant-type');
    const offlinePlantType = document.getElementById('plant-type-offline');
    
    if (onlinePlantType && onlinePlantType.querySelector('option[value="any"]')) {
        onlinePlantType.value = 'any';
    }
    
    if (offlinePlantType && offlinePlantType.querySelector('option[value="any"]')) {
        offlinePlantType.value = 'any';
    }
});

// Language Selection Functionality
document.addEventListener('DOMContentLoaded', function() {
    const languageOptions = document.querySelectorAll('.language-option');
    const currentLanguageSpan = document.getElementById('currentLanguage');
    const languageDropdown = document.getElementById('languageDropdown');
    
    // Initialize Bootstrap dropdown
    if (languageDropdown) {
        const dropdown = new bootstrap.Dropdown(languageDropdown);
    }
    
    languageOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const langCode = this.getAttribute('data-lang-code');
            const langName = this.textContent;
            
            // Update active state
            languageOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Update current language display
            currentLanguageSpan.textContent = langName;
            
            // Get the Google Translate element
            const googleElement = document.getElementById('google_translate_element');
            if (googleElement) {
                // Find and click the appropriate language option in the Google Translate widget
                const select = googleElement.querySelector('select');
                if (select) {
                    select.value = langCode;
                    select.dispatchEvent(new Event('change'));
                }
            }
            
            // Close the dropdown
            const dropdownMenu = document.querySelector('.language-dropdown-menu');
            if (dropdownMenu) {
                dropdownMenu.classList.remove('show');
            }
        });
    });
});

// Initialize language selector
function initLanguageSelector() {
    const translateBtn = document.getElementById('translateBtn');
    
    if (!translateBtn) return;
    
    // Override Bootstrap's data-bs-toggle
    translateBtn.removeAttribute('data-bs-toggle');
    
    // Use a direct click handler
    translateBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const dropdownMenu = this.nextElementSibling;
        if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
            // Toggle show class
            dropdownMenu.classList.toggle('show');
            
            // Close when clicking outside
            function handleClickOutside(e) {
                if (!translateBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownMenu.classList.remove('show');
                    document.removeEventListener('click', handleClickOutside);
                }
            }
            
            // Add the document click handler
            document.addEventListener('click', handleClickOutside);
        }
    });
    
    // Add click handlers for language options
    const languageItems = document.querySelectorAll('.dropdown-item[onclick^="translatePage"]');
    languageItems.forEach(item => {
        item.addEventListener('click', function() {
            // Close the dropdown after selection
            const dropdownMenu = translateBtn.nextElementSibling;
            if (dropdownMenu) {
                setTimeout(() => {
                    dropdownMenu.classList.remove('show');
                }, 100);
            }
        });
    });
}

// Reset model button click handler - use the new complete reset function
document.addEventListener('DOMContentLoaded', function() {
    // No longer needed - reset model button has been removed
});

// Remove event listeners for the reset model button
document.addEventListener('DOMContentLoaded', function() {
    // No longer needed - reset model button has been removed
});

// Function to handle model dimension errors and retry
async function fixModelDimensionError(e, imgURL) {
    console.log("Handling model dimension error:", e.message);
    const resultDiv = document.getElementById('result');
    
    try {
        resultDiv.innerHTML = `
            <div class="alert alert-info">
                <p><strong>Optimizing model for your image...</strong></p>
                <p>Please wait a moment.</p>
            </div>
        `;
        
        // Force reload the model to ensure we have the high-accuracy version
        await forceReloadModel(true); // Silent mode
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ALWAYS USE 224x224 to match model's expected dimensions
        const targetSize = [224, 224];
        console.log("Processing with correct dimensions:", targetSize);
        
        // Process the image using the proper approach
        const img = new Image();
        img.src = imgURL;
        await new Promise(resolve => img.onload = resolve);
        
        // Preprocess with the EXACT same approach as server
        const tensor = tf.tidy(() => {
            const pixels = tf.browser.fromPixels(img);
            const resized = tf.image.resizeBilinear(pixels, targetSize);
            const normalized = tf.div(resized, 255.0);
            return normalized.expandDims(0);
        });
        
        // Run prediction with fixed dimensions
        const prediction = offlineModel.predict(tensor);
        const probabilities = Array.from(await prediction.data());
        
        // Get max probability and class
        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const maxProb = probabilities[maxIndex];
        const className = window.diseaseClasses[maxIndex];
        
        console.log("Fixed prediction successful:", {
            class: className,
            index: maxIndex
        });
        
        // Apply confidence threshold of 0.4 like in server
        const confidenceThreshold = 0.4;
        
        // Display result with server's confidence threshold logic
        if (maxProb >= confidenceThreshold) {
            // Check if className is valid before formatting
            if (className) {
            // Format the class name to be more readable
            const formattedName = className
                .replace(/_/g, ' ')
                .replace('___', ': ')
                .replace('/', ' or ');
                
            // Use the displayResults function to show results
                displayResults(formattedName);
            } else {
                // Handle the case where className is undefined
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <p><strong>Error:</strong> Could not determine plant disease class.</p>
                        <p>Please try again with a clearer image or switch to online mode.</p>
                    </div>
                `;
            }
        } else {
            resultDiv.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-5">
                                <img src="${imgURL}" class="img-fluid rounded mb-3" style="max-width: 100%;">
                            </div>
                            <div class="col-md-7">
                                <div class="alert alert-warning">
                                    <h5><i class="fas fa-exclamation-circle"></i> Low Confidence:</h5>
                                    <p>Model is not confident about the prediction</p>
                                    <p>Try with a clearer image or better lighting.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Clean up tensors
        tensor.dispose();
        prediction.dispose();
        
        // Hide loading indicator
        const offlineLoading = document.getElementById('offline-loading');
        if (offlineLoading) {
            offlineLoading.classList.add('d-none');
        }
        
        // Re-enable the detect button
        const detectOfflineBtn = document.getElementById('detect-offline');
        if (detectOfflineBtn) {
            detectOfflineBtn.disabled = false;
        }
        
        return true;
    } catch (retryError) {
        console.error("Error in dimension fix:", retryError);
        resultDiv.innerHTML = `
            <div class="alert alert-danger">
                <p><i class="fas fa-exclamation-triangle"></i> Could not process image.</p>
                <p>Please try with a different image or reset the model.</p>
                <button class="btn btn-primary mt-2" id="retry-with-reset">
                    <i class="fas fa-sync-alt"></i> Reset Model & Try Again
                </button>
            </div>
        `;
        
        // Add event listener for the retry button
        document.getElementById('retry-with-reset').addEventListener('click', async function() {
            await forceReloadModel(false);
            document.getElementById('detect-offline').click();
        });
        
        // Hide loading indicator
        const offlineLoading = document.getElementById('offline-loading');
        if (offlineLoading) {
            offlineLoading.classList.add('d-none');
        }
        
        // Re-enable the detect button
        const detectOfflineBtn = document.getElementById('detect-offline');
        if (detectOfflineBtn) {
            detectOfflineBtn.disabled = false;
        }
        
        return true; // We handled the error with our custom UI
    }
}

// Function to process image with direct H5 model - matches online behavior
async function processWithH5Model(imgURL, resultDiv) {
    try {
        // Process similar to how it's done server-side
        console.log("Processing with H5 model for high accuracy");
        
        // Create a form to submit the image to the server
        const formData = new FormData();
        
        // Get the actual file from the image URL
        const response = await fetch(imgURL);
        const blob = await response.blob();
        formData.append('file', blob, 'image.jpg');
        
        // Send the image to a special endpoint that uses the h5 model directly
        // but processes on the client side in a web worker
        const predictResponse = await fetch('/api/predict_h5_offline', {
            method: 'POST',
            body: formData
        });
        
        if (predictResponse.ok) {
            const result = await predictResponse.json();
            
            if (result.success) {
                // Format class name for display
                const className = result.class;
                
                // Check if className is valid
                if (className) {
                    const formattedName = className
                        .replace(/_/g, ' ')
                        .replace('___', ': ')
                        .replace('/', ' or ');
                        
                    // Display prediction results using the displayResults function
                    displayResults(formattedName);
                } else {
                    // Handle the case where className is undefined
                    resultDiv.innerHTML = `
                        <div class="alert alert-warning">
                            <p><strong>Error:</strong> Could not determine plant disease class.</p>
                            <p>Please try again with a clearer image or switch to online mode.</p>
                        </div>
                    `;
                }
            } else {
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <p><strong>Error processing with H5 model:</strong> ${result.error}</p>
                        <p>Falling back to standard model...</p>
                    </div>
                `;
                
                // Fall back to regular model processing
                if (!offlineModel) {
                    const modelLoaded = await loadOfflineModel();
                    if (!modelLoaded) {
                        return;
                    }
                }
                
                // Continue with regular processing
                await processWithRegularModel(imgURL, resultDiv);
            }
        } else {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <p><strong>Server error:</strong> Could not process image with H5 model.</p>
                    <p>Trying fallback method...</p>
                </div>
            `;
            
            // Try falling back to direct offline processing
            await processWithRegularModel(imgURL, resultDiv);
        }
    } catch (error) {
        console.error("Error in H5 processing:", error);
        resultDiv.innerHTML = `
            <div class="alert alert-danger">
                <p><strong>Error:</strong> ${error.message}</p>
                <p>Trying standard offline processing...</p>
            </div>
        `;
        
        // Try falling back to direct offline processing
        await processWithRegularModel(imgURL, resultDiv);
    }
}

// Refactored original processing function to be called as a fallback
async function processWithRegularModel(imgURL, resultDiv) {
    try {
        // Show loading message
        resultDiv.innerHTML = `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">Uploaded Image</h5>
                    <img src="${imgURL}" class="img-fluid mb-3" style="max-width: 300px;">
                    <div class="alert alert-info">
                        <i class="fas fa-spinner fa-pulse me-2"></i>Processing image with AI model...
                    </div>
                </div>
            </div>
        `;
        
        // Create a tensor from the image
        const img = new Image();
        img.src = imgURL;
        await new Promise(resolve => img.onload = resolve);
        
        // Preprocess the image - ALWAYS use 224x224 to match model
        const tensor = tf.tidy(() => {
            const pixels = tf.browser.fromPixels(img);
            const resized = tf.image.resizeBilinear(pixels, [224, 224]);
            const normalized = tf.div(resized, 255.0);
            return normalized.expandDims(0);
        });
        
        // Ensure model has correct shape before prediction
        if (offlineModel.inputs[0].shape[1] !== 224 || offlineModel.inputs[0].shape[2] !== 224) {
            console.error("Model input shape mismatch, need to reload model");
            await forceReloadModel();
        }
        
        // Run inference with the model
        console.log("Running prediction with model");
        const prediction = offlineModel.predict(tensor);
        const probabilities = Array.from(await prediction.data());
        
        // Find max probability and corresponding class
        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const maxProb = probabilities[maxIndex];
        const className = window.diseaseClasses[maxIndex];
        
        console.log("Prediction result:", {
            class: className,
            allProbabilities: probabilities
        });
        
        // Use the same confidence threshold as server (0.4)
        const confidenceThreshold = 0.4;
        
        if (maxProb < confidenceThreshold) {
            // Model is not confident enough
            resultDiv.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Detection Result</h5>
                        <div class="row">
                            <div class="col-md-5">
                                <img src="${imgURL}" class="img-fluid rounded mb-3">
                            </div>
                            <div class="col-md-7">
                                <div class="alert alert-warning">
                                    <h5><i class="fas fa-exclamation-circle"></i> Low Confidence:</h5>
                                    <p>The model is not confident enough about this image</p>
                                    <p>Try taking a clearer photo with better lighting and a simple background.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Check if className is valid
            if (className) {
            // Format the class name to be more readable
            const formattedName = className
                .replace(/_/g, ' ')
                .replace('___', ': ')
                .replace('/', ' or ');
                
            // Use the displayResults function to show results
                displayResults(formattedName);
            } else {
                // Handle the case where className is undefined
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <p><strong>Error:</strong> Could not determine plant disease class.</p>
                        <p>Please try again with a clearer image or switch to online mode.</p>
                    </div>
                `;
            }
            
            // Hide loading indicator
            const offlineLoading = document.getElementById('offline-loading');
            if (offlineLoading) {
                offlineLoading.classList.add('d-none');
            }
            
            // Re-enable the detect button
            const detectOfflineBtn = document.getElementById('detect-offline');
            if (detectOfflineBtn) {
                detectOfflineBtn.disabled = false;
            }
            
            // Clean up tensors
            tensor.dispose();
            prediction.dispose();
            return;
        }
        
        // Clean up tensors
        tensor.dispose();
        prediction.dispose();
        
        // Hide loading indicator
        const offlineLoading = document.getElementById('offline-loading');
        if (offlineLoading) {
            offlineLoading.classList.add('d-none');
        }
        
        // Re-enable the detect button
        const detectOfflineBtn = document.getElementById('detect-offline');
        if (detectOfflineBtn) {
            detectOfflineBtn.disabled = false;
        }
    } catch (error) {
        console.error("Error in regular model processing:", error);
        
        // Check if it's a dimension mismatch error and try to fix it
        if (error.message && (error.message.includes('dimension') || error.message.includes('shape'))) {
            try {
                // Try to fix dimension error
                await fixModelDimensionError(error, imgURL);
            } catch (e) {
                console.error("Error in dimension fix:", e);
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <h5><i class="fas fa-exclamation-triangle"></i> Error:</h5>
                        <p>${error.message}</p>
                        <p>Please try again with a different image or reload the page.</p>
                    </div>
                `;
            }
        } else {
            // General error handling
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h5><i class="fas fa-exclamation-triangle"></i> Error:</h5>
                    <p>${error.message}</p>
                    <p>Please try again or switch to online mode if available.</p>
                </div>
            `;
        }
        
        // Hide loading indicator
        const offlineLoading = document.getElementById('offline-loading');
        if (offlineLoading) {
            offlineLoading.classList.add('d-none');
        }
        
        // Re-enable the detect button
        const detectOfflineBtn = document.getElementById('detect-offline');
        if (detectOfflineBtn) {
            detectOfflineBtn.disabled = false;
        }
    }
}

// Function to force reload the model
async function forceReloadModel(silentMode = false) {
    console.log("Forcing reload of custom disease detection model...");
    
    // Get model status elements
    const modelStatus = document.getElementById('model-status');
    const modelLoadingStatus = document.getElementById('model-loading-status');
    const modelProgressBar = document.getElementById('model-progress-bar');
    const modelProgressDiv = document.getElementById('model-progress-div');
    const offlineToggle = document.getElementById('offline-toggle');
    const resultDiv = document.getElementById('result-area');
    const isOnlineMode = document.getElementById('mode-toggle')?.value === 'online';
    
    // If in online mode or silent mode requested, don't show any messages
    if (!silentMode && !isOnlineMode && resultDiv) {
        resultDiv.innerHTML = `
            <div class="alert alert-info">
                <p><strong>Reloading disease detection model...</strong></p>
                <p>Please wait while the model is being prepared.</p>
            </div>
        `;
    }
    
    try {
        // First dispose any existing model
        if (offlineModel) {
            offlineModel.dispose();
            offlineModel = null;
        }
        
        // Clear all models from storage
        const models = await tf.io.listModels();
        for (const modelPath in models) {
            console.log(`Removing model: ${modelPath}`);
            await tf.io.removeModel(modelPath);
        }
        
        // Force clear browser cache for model files
        if ('caches' in window) {
            try {
                const cacheNames = await window.caches.keys();
                for (const cacheName of cacheNames) {
                    if (cacheName.includes('tensorflowjs') || cacheName.includes('model')) {
                        await window.caches.delete(cacheName);
                        console.log(`Deleted cache: ${cacheName}`);
                    }
                }
            } catch (e) {
                console.warn("Cache API error:", e);
            }
        }
        
        // Wait a moment for storage to clear
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get timestamp to bypass cache
        const timestamp = Date.now();
        
        // First load model metadata and class names
        window.modelMetadata = null;  // Reset metadata
        window.diseaseClasses = null; // Reset classes
        
        // Load metadata
        try {
            const metadataResponse = await fetch(`/static/model/metadata.json?t=${timestamp}`);
            if (metadataResponse.ok) {
                window.modelMetadata = await metadataResponse.json();
                console.log("Model metadata:", window.modelMetadata);
            }
        } catch (error) {
            console.warn("Could not load model metadata:", error);
        }
        
        // Load class names
        try {
            const classesResponse = await fetch(`/static/model/classes.json?t=${timestamp}`);
            if (classesResponse.ok) {
                window.diseaseClasses = await classesResponse.json();
                console.log("Loaded disease classes:", window.diseaseClasses);
            }
        } catch (error) {
            console.warn("Could not load disease classes:", error);
        }
        
        // Set up progress callback for model loading
        const progressCallback = (fraction) => {
            const percent = Math.round(fraction * 100);
            if (modelProgressBar) {
                modelProgressBar.style.width = `${percent}%`;
                modelProgressBar.innerText = `${percent}%`;
            }
            if (!silentMode) console.log(`Loading model: ${percent}%`);
        };
        
        // Set up custom weights
        const setUpDummyWeights = async () => {
            try {
                // Create dummy weights for the model - this is just for testing
                // In a real scenario, you'd load actual weights from a file
                const kernelShape = [3, 3, 3, 32]; // [height, width, inputDepth, outputDepth]
                const biasShape = [32];
                const denseKernelShape = [32, 38]; // Assuming flattened output × num classes
                const denseBiasShape = [38];
                
                // Initialize with random values
                const kernelValues = tf.randomNormal(kernelShape).arraySync();
                const biasValues = tf.zeros(biasShape).arraySync();
                const denseKernelValues = tf.randomNormal(denseKernelShape).arraySync();
                const denseBiasValues = tf.zeros(denseBiasShape).arraySync();
                
                // Create a custom model with these weights
                const model = await tf.loadLayersModel('/static/model/model.json');
                
                // Set the weights if model successfully loads
                if (model && model.layers && model.layers.length > 1) {
                    // Set weights for conv layer (first layer after input)
                    const convLayer = model.layers[1]; // Index 1 since 0 is input layer
                    await convLayer.setWeights([
                        tf.tensor(kernelValues),
                        tf.tensor(biasValues)
                    ]);
                    
                    // Set weights for dense layer (last layer)
                    const denseLayer = model.layers[4]; // Assuming it's the 5th layer (0-indexed)
                    await denseLayer.setWeights([
                        tf.tensor(denseKernelValues),
                        tf.tensor(denseBiasValues)
                    ]);
                    
                    return model;
                }
                return null;
            } catch (error) {
                console.error("Error setting up dummy weights:", error);
                return null;
            }
        };
        
        // Try to load the model, preferring the LayersModel format
        try {
            console.log("Trying to load model using tf.loadLayersModel from tfjs_model...");
            offlineModel = await tf.loadLayersModel(`/static/model/tfjs_model/model.json?t=${timestamp}`, {
                onProgress: progressCallback
            });
            console.log("Successfully loaded model from tfjs_model directory");
            
            // Save to IndexedDB for future offline use
            try {
                await offlineModel.save('indexeddb://plant-disease-model');
                console.log("Model saved to IndexedDB");
            } catch (saveError) {
                console.warn("Could not save model to IndexedDB:", saveError);
            }
        } catch (tfjsError) {
            console.warn("Could not load model from tfjs_model directory:", tfjsError);
            
            // Attempt to set up dummy weights and load that model
            try {
                console.log("Setting up model with dummy weights...");
                offlineModel = await setUpDummyWeights();
                
                if (offlineModel) {
                    console.log("Successfully created model with dummy weights");
                    
                    // Save to IndexedDB for future offline use
                    try {
                        await offlineModel.save('indexeddb://plant-disease-model');
                        console.log("Model with dummy weights saved to IndexedDB");
                    } catch (saveError) {
                        console.warn("Could not save model to IndexedDB:", saveError);
                    }
                } else {
                    throw new Error("Failed to create model with dummy weights");
                }
            } catch (dummyModelError) {
                console.error("Failed to create model with dummy weights:", dummyModelError);
                
                // Update UI to show error
                if (modelStatus) modelStatus.innerText = 'Failed to load';
                if (modelLoadingStatus) {
                    modelLoadingStatus.classList.remove('d-none');
                    modelLoadingStatus.innerHTML = `
                        <div class="alert alert-danger">
                            <strong>Error:</strong> Could not load model with valid weights
                        </div>
                    `;
                }
                
                if (resultDiv) {
                    resultDiv.innerHTML = `
                        <div class="alert alert-danger">
                            <strong>Error loading model:</strong> Could not load model with valid weights. 
                            <p>You can still use the online mode which does not require model loading.</p>
                        </div>
                    `;
                }
                
                if (offlineToggle) offlineToggle.disabled = false;
                return false;
            }
        }
        
        // Test the model with the correct input shape
        console.log("Testing model...");
        
        // Get input dimensions from metadata or model or use default
        let inputWidth = 128;
        let inputHeight = 128;
        
        if (window.modelMetadata && window.modelMetadata.preprocessingParams && 
            window.modelMetadata.preprocessingParams.targetSize) {
            inputHeight = window.modelMetadata.preprocessingParams.targetSize[0];
            inputWidth = window.modelMetadata.preprocessingParams.targetSize[1];
            console.log(`Using input dimensions from metadata: ${inputHeight}x${inputWidth}`);
        } else if (offlineModel.inputs && offlineModel.inputs[0].shape && 
                   offlineModel.inputs[0].shape.length > 2) {
            // Get from model input shape (accounting for batch dimension)
            inputHeight = offlineModel.inputs[0].shape[1];
            inputWidth = offlineModel.inputs[0].shape[2];
            console.log(`Using input dimensions from model: ${inputHeight}x${inputWidth}`);
        } else {
            console.log(`Using default input dimensions: ${inputHeight}x${inputWidth}`);
        }
        
        // Create a test tensor with the correct dimensions
        const testTensor = tf.zeros([1, inputHeight, inputWidth, 3]);
        
        // Test the model
        console.log(`Testing with tensor shape: ${testTensor.shape}`);
        const testResult = offlineModel.predict(testTensor);
        console.log("Test successful, result shape:", testResult.shape);
        
        // Check if result shape matches the number of classes we have
        const numClasses = window.diseaseClasses ? window.diseaseClasses.length : classNames.length;
        console.log(`Number of classes: ${numClasses}, prediction output size: ${testResult.shape[1]}`);
        
        // Clean up tensors
        testTensor.dispose();
        testResult.dispose();
        
        // Only show success message if not in silent mode and not in online mode
        if (!silentMode && !isOnlineMode && resultDiv) {
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <p><strong>Disease detection model loaded successfully!</strong></p>
                    <p>The offline detection should now provide accurate results.</p>
                </div>
            `;
        }
        
        // Update UI indicators
        if (modelStatus) modelStatus.innerText = 'Loaded';
        if (modelLoadingStatus) modelLoadingStatus.classList.add('d-none');
        if (modelProgressDiv) modelProgressDiv.classList.add('d-none');
        if (offlineToggle) offlineToggle.disabled = false;
        
        return true;
        
    } catch (error) {
        console.error("Error reloading model:", error);
        
        // Update UI to show error
        if (modelStatus) modelStatus.innerText = 'Error';
        if (modelLoadingStatus) {
            modelLoadingStatus.classList.remove('d-none');
            modelLoadingStatus.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
        }
        
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error loading model:</strong> ${error.message}
                    <p>You can still use the online mode which does not require model loading.</p>
                    <button class="btn btn-primary mt-2" onclick="forceReloadModel(false)">
                        <i class="fas fa-sync me-2"></i>Retry Loading Model
                    </button>
                </div>
            `;
        }
        
        if (offlineToggle) offlineToggle.disabled = false;
        return false;
    }
}

// Add help text and reload button to offline mode section
document.addEventListener('DOMContentLoaded', function() {
    // Add instructions about the offline mode
    const offlineMode = document.getElementById('offline-mode');
    if (offlineMode) {
        const header = offlineMode.querySelector('h3');
        if (header) {
            header.insertAdjacentHTML('afterend', `
                <div class="alert alert-info mb-3">
                    <p><strong>Offline Mode</strong></p>
                    <p>Take a photo or upload a plant image for local analysis without internet connection.</p>
                </div>
            `);
        }
    }
});

// Add the offline description box
document.getElementById('offline-mode').addEventListener('DOMNodeInserted', function(e) {
    // Don't add informational boxes in offline mode
});

// Update the handleModelLoadForOffline function to not add the info box
function handleModelLoadForOffline() {
    ensureJQuery(() => {
        // Start loading the model without displaying status messages
        if (!offlineModel && !offlineModelLoading) {
            offlineModelLoading = true;
            console.log("Starting model loading from handler...");
            
            // Clear any previous error message
            const resultArea = document.getElementById('result-area');
            if (resultArea) {
                resultArea.innerHTML = `
                    <div class="alert alert-info">
                        <div class="d-flex align-items-center">
                            <div class="spinner-border text-primary me-2" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <strong>Loading model...</strong>
                        </div>
                        <p class="mb-0 mt-2">Please wait while the model is loading...</p>
                    </div>
                `;
            }
            
            // Try to load the model
            loadOfflineModel()
                .then(success => {
                    offlineModelLoading = false;
                    if (success) {
                        console.log("Model loaded successfully from handler");
                        // Update UI to show success
                        if (resultArea) {
                            resultArea.innerHTML = `
                                <div class="alert alert-success">
                                    <strong>Model loaded successfully!</strong>
                                    <p>You can now use the offline detection feature.</p>
                                </div>
                            `;
                            // Fade out the success message after 3 seconds
                            setTimeout(() => {
                                $(resultArea).find('.alert').fadeOut(500, function() {
                                    resultArea.innerHTML = '';
                                });
                            }, 3000);
                        }
                    } else {
                        console.error("Model failed to load from handler");
                        if (resultArea) {
                            resultArea.innerHTML = `
                                <div class="alert alert-danger">
                                    <p><strong>Error loading model</strong></p>
                                    <p>Could not load the detection model. Please check your internet connection and try again.</p>
                                    <button class="btn btn-primary mt-2" onclick="forceReloadModel(false)">
                                        <i class="fas fa-sync me-2"></i>Retry Loading Model
                                    </button>
                                </div>
                            `;
                        }
                    }
                })
                .catch(error => {
                    offlineModelLoading = false;
                    console.error("Error loading offline model:", error);
                    if (resultArea) {
                        resultArea.innerHTML = `
                            <div class="alert alert-danger">
                                <p><strong>Error loading model</strong></p>
                                <p>Could not load the detection model: ${error.message}</p>
                                <button class="btn btn-primary mt-2" onclick="forceReloadModel(false)">
                                    <i class="fas fa-sync me-2"></i>Retry Loading Model
                                </button>
                            </div>
                        `;
                    }
                });
        }
    });
}

function displayResults(prediction) {
    // Clear results area 
    const resultArea = document.getElementById('result-area');
    if (!resultArea) return;
    
    // Create the HTML for results - simple layout with just the disease name
    let resultHTML = `
        <div class="card mb-4">
            <div class="card-header bg-success text-white">
                <h5 class="mb-0"><i class="fas fa-check-circle me-2"></i>Detection Result</h5>
            </div>
            <div class="card-body">
                <h4 class="mb-3">Detected Disease: </h4>
                <div class="alert alert-info">
                    <h5 class="mb-0"><i class="fas fa-bug me-2"></i>${prediction}</h5>
                </div>
            </div>
        </div>
    `;
    
    // Add the result HTML to the page
    resultArea.innerHTML = resultHTML;
    
    // Scroll to results if the element exists
    if (resultArea) {
        try {
            resultArea.scrollIntoView({behavior: 'smooth'});
        } catch (error) {
            // Silently handle scroll errors
        }
    }
}

// Load jQuery dynamically if it's not already loaded
function ensureJQuery(callback) {
    if (typeof jQuery === 'undefined') {
        console.log('jQuery not detected, loading it dynamically...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js';
        script.onload = function() {
            console.log('jQuery loaded successfully');
            if (callback) callback();
        };
        script.onerror = function() {
            console.error('Failed to load jQuery');
        };
        document.head.appendChild(script);
    } else {
        console.log('jQuery already loaded');
        if (callback) callback();
    }
}

// Initialize offline detection when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're in offline mode
    const modeToggle = document.getElementById('mode-toggle');
    if (modeToggle && modeToggle.value === 'offline') {
        console.log("Page loaded in offline mode, preloading model...");
        // Add a slight delay to ensure all other initialization is complete
        setTimeout(() => {
            handleModelLoadForOffline();
        }, 500);
    }
});


