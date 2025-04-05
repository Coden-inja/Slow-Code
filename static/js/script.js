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
    
    // Preload the high-accuracy model in the background
    setTimeout(() => {
        // Only preload if we're in offline mode
        if (document.getElementById('mode-toggle').value === 'offline') {
            console.log("Preloading high-accuracy model in the background...");
            forceReloadModel(true).then(success => {
                if (success) {
                    console.log("High-accuracy model preloaded successfully!");
                } else {
                    console.warn("Could not preload high-accuracy model");
                }
            });
        }
    }, 2000); // Wait 2 seconds before starting the preload
});

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
        
        // Show loading message right away in offline mode
        resultDiv.innerHTML = `
            <div class="alert alert-info">
                <p><strong>Preparing offline mode...</strong></p>
                <p>Loading high-accuracy model for offline detection. Please wait.</p>
            </div>
        `;
        
        // Load the model and show status
        forceReloadModel(false).then(loaded => {
            console.log("Offline model loaded:", loaded);
            if (!loaded) {
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <p><strong>Offline model could not be loaded.</strong></p>
                        <p>Please try again or check your internet connection to download the model.</p>
                    </div>
                `;
            }
        });
    }
});

// Global variables for offline mode
let offlineModel = null;
let offlineModelLoading = false;
let offlineModelLoadingAttempted = false;

// Class names for disease detection
const classNames = [
    'Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust', 'Apple___healthy',
    'Blueberry___healthy', 'Cherry_(including_sour)___Powdery_mildew', 'Cherry_(including_sour)___healthy',
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot', 'Corn_(maize)___Common_rust_',
    'Corn_(maize)___Northern_Leaf_Blight', 'Corn_(maize)___healthy', 'Grape___Black_rot',
    'Grape___Esca_(Black_Measles)', 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', 'Grape___healthy',
    'Orange___Haunglongbing_(Citrus_greening)', 'Peach___Bacterial_spot', 'Peach___healthy',
    'Pepper,_bell___Bacterial_spot', 'Pepper,_bell___healthy', 'Potato___Early_blight', 'Potato___Late_blight',
    'Potato___healthy', 'Raspberry___healthy', 'Soybean___healthy', 'Squash___Powdery_mildew',
    'Strawberry___Leaf_scorch', 'Strawberry___healthy', 'Tomato___Bacterial_spot', 'Tomato___Early_blight',
    'Tomato___Late_blight', 'Tomato___Leaf_Mold', 'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites Two-spotted_spider_mite', 'Tomato___Target_Spot',
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus', 'Tomato___Tomato_mosaic_virus', 'Tomato___healthy'
];

// Load offline model
async function loadOfflineModel() {
    if (offlineModelLoading) return false;
    offlineModelLoading = true;
    
    console.log("Starting offline model loading process");
    
    try {
        // Check if TensorFlow is available
        if (typeof tf === 'undefined') {
            console.error("TensorFlow.js not loaded");
            offlineModelLoading = false;
            return false;
        }

        // First try to load from IndexedDB if it exists
        try {
            console.log("Checking for locally stored high-accuracy model...");
            const models = await tf.io.listModels();
            const highAccuracyPath = 'indexeddb://plant-disease-model-highaccuracy';
            
            // If model exists in storage, try to load it
            if (models[highAccuracyPath]) {
                try {
                    console.log("Found high-accuracy model in local storage");
                    window.offlineModel = await tf.loadLayersModel(highAccuracyPath);
                    console.log("Successfully loaded high-accuracy model from IndexedDB");
                    
                    // Quick verification to ensure the model has the correct structure
                    try {
                        // Always use 224x224 input shape to match server model
                        console.log("Testing model with 224x224 dimensions");
                        const testTensor = tf.zeros([1, 224, 224, 3]);
                        const testResult = window.offlineModel.predict(testTensor);
                        
                        // Check output shape matches number of classes
                        if (testResult.shape[1] === classNames.length) {
                            console.log("Model verification successful. Output shape:", testResult.shape);
                            testTensor.dispose();
                            testResult.dispose();
                            offlineModelLoading = false;
                            return true;
                        } else {
                            console.warn("Model output shape mismatch. Expected:", classNames.length, "Got:", testResult.shape[1]);
                            testTensor.dispose();
                            testResult.dispose();
                            // Stored model is not compatible, delete it
                            await tf.io.removeModel(highAccuracyPath);
                        }
                    } catch (testError) {
                        console.error("Model test prediction failed:", testError);
                        window.offlineModel = null;
                    }
                } catch (loadError) {
                    console.error("Failed to load model from storage:", loadError);
                    // Try to clear the corrupted model
                    await tf.io.removeModel(highAccuracyPath);
                    window.offlineModel = null;
                }
            }
            
            // If no model loaded from storage, load from server
            if (!window.offlineModel) {
                console.log("Loading high-accuracy model from server...");
                
                // Load the model directly from the server with the same path as Flask uses
                window.offlineModel = await tf.loadLayersModel('/static/model/model.json', {
                    onProgress: (fraction) => {
                        console.log(`Model loading progress: ${Math.round(fraction * 100)}%`);
                    }
                });
                
                console.log("Successfully loaded high-accuracy model from server");
                
                // Save the model to IndexedDB for future offline use
                try {
                    await window.offlineModel.save(highAccuracyPath);
                    console.log("Saved high-accuracy model to IndexedDB");
                } catch (saveError) {
                    console.warn("Could not save model to IndexedDB:", saveError);
                }
                
                offlineModelLoading = false;
                return true;
            }
            
            return !!window.offlineModel;
        } catch (error) {
            console.error("Error during model loading:", error);
            
            // One last attempt to load directly from server if all else fails
            try {
                console.log("Last attempt: Loading model directly from server...");
                
                // Load the model directly without saving to IndexedDB
                window.offlineModel = await tf.loadLayersModel('/static/model/model.json');
                console.log("Successfully loaded model from server on last attempt");
                
                offlineModelLoading = false;
                return true;
            } catch (finalError) {
                console.error("Final attempt to load model failed:", finalError);
                offlineModelLoading = false;
                return false;
            }
        }
    } catch (error) {
        console.error('Error during model loading process:', error);
        offlineModelLoading = false;
        return false;
    }
}

// Function to clear model storage
async function clearModelStorage() {
    const resultDiv = document.getElementById('result');
    
    try {
        const modelPath = 'indexeddb://plant-disease-model';
        await tf.io.removeModel(modelPath);
        window.offlineModel = null;
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
    if (!window.offlineModel) return false;
    
    try {
        // Get the model information
        const inputShape = window.offlineModel.inputs[0].shape;
        console.log("Model input shape:", inputShape);
        
        // Always use 224x224 to match the model
        const testTensor = tf.zeros([1, 224, 224, 3]);
        
        // Try a prediction
        try {
            const testResult = window.offlineModel.predict(testTensor);
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
        if (window.offlineModel) {
            window.offlineModel.dispose();
            window.offlineModel = null;
        }
        
        // Clear all models from IndexedDB
        const models = await tf.io.listModels();
        for (const modelPath in models) {
            if (modelPath.includes('plant-disease-model')) {
                console.log("Clearing model:", modelPath);
                await tf.io.removeModel(modelPath);
            }
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
            window.offlineModel = await tf.loadLayersModel(modelPath, {
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
            await window.offlineModel.save('indexeddb://plant-disease-model-' + new Date().getTime());
            
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
    if (!window.offlineModel) return false;
    
    try {
        // Get model input shape
        const modelInputShape = window.offlineModel.inputs[0].shape;
        console.log("Model input shape:", modelInputShape);
        
        // Use 224x224 dimensions to match the model
        const testTensor = tf.zeros([1, 224, 224, 3]);
        
        try {
            // Try prediction with 224x224
            const testResult = window.offlineModel.predict(testTensor);
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

// Update detect-offline button click handler to work with captured photos
document.addEventListener('DOMContentLoaded', function() {
    const detectOfflineBtn = document.getElementById('detect-offline');
    
    if (detectOfflineBtn) {
        // Store the original click handler
        const originalClickHandler = detectOfflineBtn.onclick;
        
        // Replace with new handler that checks for captured photos
        detectOfflineBtn.onclick = async function() {
            const imageInput = document.getElementById('image-input');
            const resultDiv = document.getElementById('result');
            
            // Check if we have a captured photo
            if (window.capturedPhotoURL) {
                const imgURL = window.capturedPhotoURL;
                resultDiv.innerHTML = `
                    <div class="card mb-3">
                        <div class="card-body">
                            <h5 class="card-title">Captured Image</h5>
                            <img src="${imgURL}" class="img-fluid mb-3" style="max-width: 300px;">
                            <div class="alert alert-info">Processing image...</div>
                        </div>
                    </div>
                `;
                
                // Check if model is loaded
                if (!window.offlineModel) {
                    const modelLoaded = await loadOfflineModel();
                    if (!modelLoaded) {
                        return;
                    }
                }
                
                // Process with current model
                await processWithRegularModel(imgURL, resultDiv);
                
                // Clear the stored photo URL
                window.capturedPhotoURL = null;
                return;
            }
            
            // If no captured photo, use file input as before
            if (!imageInput.files || imageInput.files.length === 0) {
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <p>Please take a photo or select an image first.</p>
                    </div>
                `;
                return;
            }
            
            // Continue with file processing as before
            const file = imageInput.files[0];
            const imgURL = URL.createObjectURL(file);
            resultDiv.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Uploaded Image</h5>
                        <img src="${imgURL}" class="img-fluid mb-3" style="max-width: 300px;">
                        <div class="alert alert-info">Processing image...</div>
                    </div>
                </div>
            `;
            
            // Check if model is loaded
            if (!window.offlineModel) {
                const modelLoaded = await loadOfflineModel();
                if (!modelLoaded) {
                    return;
                }
            }
            
            // Verify model has the correct dimensions for 224x224
            const modelInputShape = window.offlineModel.inputs[0].shape;
            if (!modelInputShape || modelInputShape[1] !== 224 || modelInputShape[2] !== 224) {
                console.log("Model has incorrect dimensions, reloading...");
                await forceReloadModel();
            }
            
            // Process with current model
            await processWithRegularModel(imgURL, resultDiv);
        };
    }
});

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
                    <div class="text-right">
                        <button id="reset-model-btn" class="btn btn-outline-dark btn-sm mt-1">
                            <i class="fas fa-sync-alt"></i> Reset Model
                        </button>
                    </div>
                </div>
            `);
            
            // Add event listener for the reset model button
            setTimeout(() => {
                const resetBtn = document.getElementById('reset-model-btn');
                if (resetBtn) {
                    resetBtn.addEventListener('click', async function() {
                        const resultDiv = document.getElementById('result');
                        resultDiv.innerHTML = `
                            <div class="alert alert-info">
                                <p><strong>Resetting model...</strong></p>
                                <p>Downloading high-accuracy model...</p>
                            </div>
                        `;
                        
                        // Force reload the high-accuracy model
                        await forceReloadModel(false);
                    });
                }
            }, 100);
        }
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

// Reset model button click handler
document.addEventListener('DOMContentLoaded', function() {
    const resetModelBtn = document.getElementById('reset-model-btn');
    if (resetModelBtn) {
        resetModelBtn.addEventListener('click', async function() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = `
                <div class="alert alert-info">
                    <p><strong>Preparing to reset model...</strong></p>
                </div>
            `;
            
            // Call the reset function
            const success = await forceModelReset();
            
            if (success) {
                resultDiv.innerHTML = `
                    <div class="alert alert-success">
                        <p><strong>Model reset successful!</strong></p>
                        <p>You can now try detecting diseases again.</p>
                    </div>
                `;
            }
        });
    }
});

// Add a complete reset function for the model
async function resetCompleteModel() {
    try {
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `
            <div class="alert alert-info">
                <p><strong>Performing complete model reset...</strong></p>
                <p>This will clear all cached model data and download a fresh version.</p>
            </div>
        `;
        
        // Clear all indexedDB storage related to TensorFlow.js
        console.log("Clearing all model storage...");
        
        // First dispose of any loaded models
        if (window.offlineModel) {
            window.offlineModel.dispose();
            window.offlineModel = null;
        }
        
        // Clear model metadata
        window.modelMetadata = null;
        
        // List and clear all models
        try {
            const models = await tf.io.listModels();
            for (const modelPath in models) {
                console.log(`Removing model: ${modelPath}`);
                await tf.io.removeModel(modelPath);
            }
        } catch (e) {
            console.warn("Error listing/removing models:", e);
        }
        
        // Clear browser caches if possible
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
                console.warn("Error clearing caches:", e);
            }
        }
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force a fresh download from the server
        resultDiv.innerHTML = `
            <div class="alert alert-info">
                <p><strong>Downloading fresh model...</strong></p>
                <div class="progress mt-2">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                         role="progressbar" style="width: 0%" 
                         aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                </div>
            </div>
        `;
        
        // Load the fresh model
        try {
            // First, fetch metadata
            let modelMetadata;
            try {
                // Add a cache-busting parameter
                const metadataResponse = await fetch(`/static/model/metadata.json?t=${Date.now()}`);
                if (metadataResponse.ok) {
                    modelMetadata = await metadataResponse.json();
                    console.log("Fresh metadata loaded:", modelMetadata);
                    window.modelMetadata = modelMetadata;
                }
            } catch (metadataError) {
                console.warn("Could not load metadata:", metadataError);
            }
            
            // Then load the model with a progress indicator
            const progressBar = document.querySelector('.progress-bar');
            window.offlineModel = await tf.loadLayersModel(`/static/model/model.json?t=${Date.now()}`, {
                onProgress: (fraction) => {
                    const percent = Math.round(fraction * 100);
                    if (progressBar) {
                        progressBar.style.width = `${percent}%`;
                        progressBar.setAttribute('aria-valuenow', percent);
                        progressBar.textContent = `${percent}%`;
                    }
                }
            });
            
            // Save to a new, uniquely named path
            const uniqueModelPath = `indexeddb://plant-disease-model-${Date.now()}`;
            await window.offlineModel.save(uniqueModelPath);
            
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <p><strong>Model reset complete!</strong></p>
                    <p>The model has been completely reloaded from the server and cached for offline use.</p>
                    <p>You can now try detecting plant diseases again.</p>
                </div>
            `;
            return true;
        } catch (error) {
            console.error("Error loading fresh model:", error);
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <p><strong>Model reset failed.</strong></p>
                    <p>Error: ${error.message}</p>
                    <p>Please try switching to online mode or using a different browser.</p>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error("General error during model reset:", error);
        return false;
    }
}

// Reset model button click handler - use the new complete reset function
document.addEventListener('DOMContentLoaded', function() {
    const resetModelBtn = document.getElementById('reset-model-btn');
    if (resetModelBtn) {
        resetModelBtn.addEventListener('click', async function() {
            // Call the new complete reset function
            await resetCompleteModel();
        });
    }
});

// Remove event listeners for the reset model button
document.addEventListener('DOMContentLoaded', function() {
    // Remove any existing reset model button event listeners
    const resetModelBtn = document.getElementById('reset-model-btn');
    if (resetModelBtn) {
        // Clone and replace to remove event listeners
        const newBtn = resetModelBtn.cloneNode(true);
        resetModelBtn.parentNode.replaceChild(newBtn, resetModelBtn);
        
        // Hide the button
        newBtn.style.display = 'none';
    }
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
        const prediction = window.offlineModel.predict(tensor);
        const probabilities = Array.from(await prediction.data());
        
        // Get max probability and class
        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const maxProb = probabilities[maxIndex];
        const className = classNames[maxIndex];
        
        console.log("Fixed prediction successful:", {
            class: className,
            index: maxIndex,
            confidence: maxProb
        });
        
        // Apply confidence threshold of 0.4 like in server
        const confidenceThreshold = 0.4;
        
        // Display result with server's confidence threshold logic
        if (maxProb >= confidenceThreshold) {
            resultDiv.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Detection Result</h5>
                        <div class="row">
                            <div class="col-md-5">
                                <img src="${imgURL}" class="img-fluid rounded mb-3" style="max-width: 100%;">
                            </div>
                            <div class="col-md-7">
                                <div class="alert alert-success">
                                    <h5><i class="fas fa-check-circle"></i> Disease Detected:</h5>
                                    <p class="mb-1"><strong>Disease:</strong> ${className.replace(/_/g, ' ')}</p>
                                    <p><strong>Confidence:</strong> ${(maxProb * 100).toFixed(2)}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Detection Result</h5>
                        <div class="row">
                            <div class="col-md-5">
                                <img src="${imgURL}" class="img-fluid rounded mb-3" style="max-width: 100%;">
                            </div>
                            <div class="col-md-7">
                                <div class="alert alert-warning">
                                    <h5><i class="fas fa-exclamation-circle"></i> Low Confidence:</h5>
                                    <p>Model is not confident about the prediction (${(maxProb * 100).toFixed(2)}%)</p>
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
                // Display prediction results
                const className = result.class;
                const confidence = result.confidence;
                
                resultDiv.innerHTML = `
                    <div class="card mb-3">
                        <div class="card-body">
                            <h5 class="card-title">Detection Result (High Accuracy)</h5>
                            <div class="row">
                                <div class="col-md-5">
                                    <img src="${imgURL}" class="img-fluid rounded mb-3" style="max-width: 100%;">
                                </div>
                                <div class="col-md-7">
                                    <div class="alert alert-success">
                                        <h5><i class="fas fa-check-circle"></i> Disease Detected:</h5>
                                        <p class="mb-1"><strong>Disease:</strong> ${className}</p>
                                        <p><strong>Confidence:</strong> ${(confidence * 100).toFixed(2)}%</p>
                                        <p><small class="text-muted">Using same model as online mode</small></p>
                                    </div>
                                    <div class="mt-3">
                                        <h6>What to do next:</h6>
                                        <p>Based on this diagnosis, we recommend consulting with a local agricultural expert for treatment options.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <p><strong>Error processing with H5 model:</strong> ${result.error}</p>
                        <p>Falling back to standard model...</p>
                    </div>
                `;
                
                // Fall back to regular model processing
                if (!window.offlineModel) {
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
        // If model isn't loaded, load it properly with the high accuracy model first
        if (!window.offlineModel) {
            resultDiv.innerHTML = `
                <div class="alert alert-info">
                    <p><strong>Loading model...</strong></p>
                    <p>Please wait while the high-accuracy model is being loaded.</p>
                </div>
            `;
            const success = await forceReloadModel();
            if (!success) {
                throw new Error("Failed to load the high-accuracy model. Please check your internet connection and try again.");
            }
        }
        
        // Process the image - EXACTLY like the server model
        const img = new Image();
        img.src = imgURL;
        await new Promise((resolve) => img.onload = resolve);
        
        // CRITICAL: Always use 224x224 to match the model's expected dimensions
        const targetSize = [224, 224];
        console.log("Using target size:", targetSize);
        
        // Preprocess the image to match model's expected input - using same steps as server
        const tensor = tf.tidy(() => {
            // Read the image pixels
            const pixels = tf.browser.fromPixels(img);
            
            // Resize to 224x224 to match the model's input shape
            const resized = tf.image.resizeBilinear(pixels, targetSize);
            
            // Normalize exactly as the server does (to [0,1] range)
            const normalized = tf.div(resized, 255.0);
            
            // Add batch dimension [1, height, width, 3]
            return normalized.expandDims(0);
        });
        
        // Ensure model has correct shape before prediction
        if (window.offlineModel.inputs[0].shape[1] !== 224 || window.offlineModel.inputs[0].shape[2] !== 224) {
            console.error("Model input shape mismatch, need to reload model");
            await forceReloadModel();
        }
        
        // Run inference with the model
        console.log("Running prediction with model");
        const prediction = window.offlineModel.predict(tensor);
        const probabilities = Array.from(await prediction.data());
        
        // Find max probability and corresponding class
        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const maxProb = probabilities[maxIndex];
        const className = classNames[maxIndex];
        
        console.log("Prediction result:", {
            class: className,
            confidence: maxProb,
            allProbabilities: probabilities
        });
        
        // Use the same confidence threshold as server (0.4)
        const confidenceThreshold = 0.4;
        
        // Display result with same formatting as the server result, but only showing the top prediction
        if (maxProb >= confidenceThreshold) {
            // Show loading message while fetching treatment information
            resultDiv.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Detection Result</h5>
                        <div class="row">
                            <div class="col-md-5">
                                <img src="${imgURL}" class="img-fluid rounded mb-3" style="max-width: 100%;">
                            </div>
                            <div class="col-md-7">
                                <div class="alert alert-success">
                                    <h5><i class="fas fa-check-circle"></i> Disease Detected:</h5>
                                    <p class="mb-1"><strong>Disease:</strong> ${className.replace(/_/g, ' ')}</p>
                                    <p><strong>Confidence:</strong> ${(maxProb * 100).toFixed(2)}%</p>
                                </div>
                                <div class="alert alert-info">
                                    <p><strong>Fetching treatment information...</strong></p>
                                    <div class="spinner-border spinner-border-sm" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Try to fetch treatment information from server
            try {
                // Check if online
                const isOnline = navigator.onLine;
                if (isOnline) {
                    // Make API call to get treatment info
                    const response = await fetch('/api/text-detection', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            symptoms: `Provide information about the plant disease: ${className}`
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.result) {
                            // Parse the sections
                            const treatmentInfo = data.result;
                            let sections = treatmentInfo.split('\n\n');
                            let treatmentSection = '';
                            let preventionSection = '';
                            let referencesSection = '';
                            
                            for (const section of sections) {
                                if (section.includes('Treatment:')) {
                                    treatmentSection = section;
                                } else if (section.includes('Prevention:')) {
                                    preventionSection = section;
                                } else if (section.includes('References:')) {
                                    referencesSection = section;
                                }
                            }
                            
                            // Update the UI with the information
                            resultDiv.innerHTML = `
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h5 class="card-title">Detection Result</h5>
                                        <div class="row">
                                            <div class="col-md-5">
                                                <img src="${imgURL}" class="img-fluid rounded mb-3" style="max-width: 100%;">
                                            </div>
                                            <div class="col-md-7">
                                                <div class="alert alert-success">
                                                    <h5><i class="fas fa-check-circle"></i> Disease Detected:</h5>
                                                    <p class="mb-1"><strong>Disease:</strong> ${className.replace(/_/g, ' ')}</p>
                                                    <p><strong>Confidence:</strong> ${(maxProb * 100).toFixed(2)}%</p>
                                                </div>
                                                
                                                ${treatmentSection ? `
                                                <div class="treatment-section mb-3">
                                                    <h5><i class="fas fa-prescription-bottle me-2"></i>Treatment Options</h5>
                                                    ${treatmentSection.replace("Treatment:", "")}
                                                </div>
                                                ` : ''}
                                                
                                                ${preventionSection ? `
                                                <div class="prevention-section mb-3">
                                                    <h5><i class="fas fa-shield-alt me-2"></i>Prevention Measures</h5>
                                                    ${preventionSection.replace("Prevention:", "")}
                                                </div>
                                                ` : ''}
                                                
                                                ${referencesSection ? `
                                                <div class="references-section mb-3">
                                                    <h5><i class="fas fa-book me-2"></i>References</h5>
                                                    <div class="references-content small">
                                                        ${referencesSection.replace("References:", "")}
                                                    </div>
                                                </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                            return;
                        }
                    }
                }
                
                // If fetch fails or we're offline, show basic result
                resultDiv.innerHTML = `
                    <div class="card mb-3">
                        <div class="card-body">
                            <h5 class="card-title">Detection Result</h5>
                            <div class="row">
                                <div class="col-md-5">
                                    <img src="${imgURL}" class="img-fluid rounded mb-3" style="max-width: 100%;">
                                </div>
                                <div class="col-md-7">
                                    <div class="alert alert-success">
                                        <h5><i class="fas fa-check-circle"></i> Disease Detected:</h5>
                                        <p class="mb-1"><strong>Disease:</strong> ${className.replace(/_/g, ' ')}</p>
                                        <p><strong>Confidence:</strong> ${(maxProb * 100).toFixed(2)}%</p>
                                    </div>
                                    <div class="alert alert-info">
                                        <p><i class="fas fa-info-circle"></i> Connect to the internet for detailed treatment and prevention information.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error("Error fetching treatment information:", error);
                // Show basic result on error
                resultDiv.innerHTML = `
                    <div class="card mb-3">
                        <div class="card-body">
                            <h5 class="card-title">Detection Result</h5>
                            <div class="row">
                                <div class="col-md-5">
                                    <img src="${imgURL}" class="img-fluid rounded mb-3" style="max-width: 100%;">
                                </div>
                                <div class="col-md-7">
                                    <div class="alert alert-success">
                                        <h5><i class="fas fa-check-circle"></i> Disease Detected:</h5>
                                        <p class="mb-1"><strong>Disease:</strong> ${className.replace(/_/g, ' ')}</p>
                                        <p><strong>Confidence:</strong> ${(maxProb * 100).toFixed(2)}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        } else {
            // For low confidence, show a clear message
            resultDiv.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Detection Result</h5>
                        <div class="row">
                            <div class="col-md-5">
                                <img src="${imgURL}" class="img-fluid rounded mb-3" style="max-width: 100%;">
                            </div>
                            <div class="col-md-7">
                                <div class="alert alert-warning">
                                    <h5><i class="fas fa-exclamation-circle"></i> Low Confidence:</h5>
                                    <p>The model is not confident about the prediction (${(maxProb * 100).toFixed(2)}%).</p>
                                    <p>For more accurate results, try with a clearer image or use the online mode.</p>
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
        
    } catch (error) {
        console.error('Error processing image:', error);
        
        // Try to fix dimension mismatch errors
        const fixed = await fixModelDimensionError(error, imgURL);
        if (fixed) {
            return; // Error was handled and fixed
        }
        
        // If error wasn't fixed, show error message
        resultDiv.innerHTML = `
            <div class="alert alert-danger">
                <p><i class="fas fa-exclamation-triangle"></i> Error processing image: ${error.message}</p>
                <p>Please try again with a different image or reload the model.</p>
                <button class="btn btn-primary mt-2" onclick="forceReloadModel().then(() => document.getElementById('detect-offline').click())">
                    <i class="fas fa-sync-alt"></i> Reload Model & Try Again
                </button>
            </div>
        `;
    }
}

// Add this new function to force clear storage and reload model
async function forceReloadModel(silentMode = false) {
    console.log("Forcing reload of high-accuracy model...");
    const resultDiv = document.getElementById('result');
    const isOnlineMode = document.getElementById('mode-toggle').value === 'online';
    
    // If in online mode or silent mode requested, don't show any messages
    if (!silentMode && !isOnlineMode && resultDiv) {
        resultDiv.innerHTML = `
            <div class="alert alert-info">
                <p><strong>Reloading high-accuracy model...</strong></p>
                <p>Please wait while the model is being prepared.</p>
            </div>
        `;
    }
    
    try {
        // First dispose any existing model
        if (window.offlineModel) {
            window.offlineModel.dispose();
            window.offlineModel = null;
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
        
        // Load fresh model directly from server
        try {
            // Get metadata first for proper configuration
            let modelMetadata;
            try {
                const metadataResponse = await fetch('/static/model/metadata.json?t=' + Date.now());
                if (metadataResponse.ok) {
                    modelMetadata = await metadataResponse.json();
                    console.log("High-accuracy model metadata:", modelMetadata);
                    window.modelMetadata = modelMetadata;
                }
            } catch (e) {
                console.warn("Could not load metadata:", e);
            }
            
            // Load model with progress indicator
            console.log("Loading fresh high-accuracy model...");
            window.offlineModel = await tf.loadLayersModel('/static/model/model.json?t=' + Date.now(), {
                onProgress: (fraction) => {
                    // Only show progress if not in silent mode and not in online mode
                    const percent = Math.round(fraction * 100);
                    if (!silentMode && !isOnlineMode && resultDiv) {
                        resultDiv.innerHTML = `
                            <div class="alert alert-info">
                                <p><strong>Loading high-accuracy model: ${percent}%</strong></p>
                                <div class="progress">
                                    <div class="progress-bar" role="progressbar" 
                                         style="width: ${percent}%" 
                                         aria-valuenow="${percent}" 
                                         aria-valuemin="0" 
                                         aria-valuemax="100"></div>
                                </div>
                            </div>
                        `;
                    }
                }
            });
            
            console.log("Successfully loaded high-accuracy model");
            
            // Save to a new path in storage for future use
            const modelPath = 'indexeddb://plant-disease-model-highaccuracy';
            await window.offlineModel.save(modelPath);
            console.log(`Saved high-accuracy model to ${modelPath}`);
            
            // Test the model
            if (window.offlineModel) {
                try {
                    // Always use 224x224 dimensions
                    console.log("Testing high-accuracy model...");
                    const testTensor = tf.zeros([1, 224, 224, 3]);
                    const testResult = window.offlineModel.predict(testTensor);
                    console.log("Test successful:", testResult.shape);
                    testTensor.dispose();
                    testResult.dispose();
                    
                    // Only show success message if not in silent mode and not in online mode
                    if (!silentMode && !isOnlineMode && resultDiv) {
                        resultDiv.innerHTML = `
                            <div class="alert alert-success">
                                <p><strong>High-accuracy model loaded successfully!</strong></p>
                                <p>The offline detection should now provide results very similar to the online version.</p>
                            </div>
                        `;
                    }
                    
                    return true;
                } catch (e) {
                    console.error("Model test failed:", e);
                    if (!silentMode && !isOnlineMode && resultDiv) {
                        resultDiv.innerHTML = `
                            <div class="alert alert-danger">
                                <p><strong>Error testing model:</strong> ${e.message}</p>
                                <p>Please try again or switch to online mode.</p>
                            </div>
                        `;
                    }
                    return false;
                }
            }
            
            return true;
        } catch (e) {
            console.error("Error loading model:", e);
            if (!silentMode && !isOnlineMode && resultDiv) {
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <p><strong>Error loading model:</strong> ${e.message}</p>
                        <p>Please try again or switch to online mode.</p>
                    </div>
                `;
            }
            return false;
        }
    } catch (e) {
        console.error("Error preparing model:", e);
        if (!silentMode && !isOnlineMode && resultDiv) {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <p><strong>Error preparing model:</strong> ${e.message}</p>
                    <p>Please try again or switch to online mode.</p>
                </div>
            `;
        }
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
                    <div class="text-right">
                        <button id="reset-model-btn" class="btn btn-outline-dark btn-sm mt-1">
                            <i class="fas fa-sync-alt"></i> Reset Model
                        </button>
                    </div>
                </div>
            `);
            
            // Add event listener for the reset model button
            setTimeout(() => {
                const resetBtn = document.getElementById('reset-model-btn');
                if (resetBtn) {
                    resetBtn.addEventListener('click', async function() {
                        const resultDiv = document.getElementById('result');
                        resultDiv.innerHTML = `
                            <div class="alert alert-info">
                                <p><strong>Resetting model...</strong></p>
                                <p>Downloading high-accuracy model...</p>
                            </div>
                        `;
                        
                        // Force reload the high-accuracy model
                        await forceReloadModel(false);
                    });
                }
            }, 100);
        }
    }
});


