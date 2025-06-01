// real-estate-app/backend/server.js

// Import necessary Node.js packages
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cloudinary = require('cloudinary').v2; // Import Cloudinary v2 SDK

// Load environment variables from the .env file into process.env.
// This MUST be called *before* accessing process.env variables for configurations.
dotenv.config();

// ... (other imports like express, mongoose, dotenv, cors) ...
const cloudinary = require('cloudinary').v2;

dotenv.config(); // This line loads your .env file variables into process.env

// --- Cloudinary Configuration ---
// This block correctly accesses the variables from process.env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Correct way to access from .env
    api_key: process.env.CLOUDINARY_API_KEY,       // Correct way to access from .env
    api_secret: process.env.CLOUDINARY_API_SECRET  // Correct way to access from .env
});
// --- End Cloudinary Configuration ---

// Create an Express application instance
const app = express();

// Define the port for the server to listen on.
// It tries to use the PORT variable from .env, or defaults to 3000.
const PORT = process.env.PORT || 3000;

// --- Middleware Setup ---
// 1. CORS Middleware:
//    Enables Cross-Origin Resource Sharing. This allows your frontend (e.g., on localhost:5500)
//    to make requests to your backend (e.g., on localhost:3000).
//    For production, it's safer to restrict `origin` to your specific frontend domain.
app.use(cors());

// 2. Express JSON Body Parser Middleware:
//    Parses incoming request bodies with JSON payloads (e.g., for non-file data like title, description).
//    Multer will handle `multipart/form-data` for file uploads, but this is still needed for other JSON requests.
app.use(express.json());

// --- MongoDB Database Connection ---
// Retrieve the MongoDB connection URI from environment variables.
const MONGODB_URI = process.env.MONGODB_URI;

// Establish connection to MongoDB using Mongoose.
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully!')) // Success callback
    .catch(err => {
        console.error('MongoDB connection error:', err); // Error callback
        // If the database connection fails, it's a critical error, so exit the Node.js process.
        process.exit(1);
    });

// --- API Routes Setup ---
// Import the properties router. This file contains all specific API routes for property listings.
const propertiesRouter = require('./routes/properties');
// Mount the properties router. All requests starting with /api/properties will be handled by propertiesRouter.
app.use('/api/properties', propertiesRouter);

// --- Basic Root Route ---
// A simple route to verify that the server is running when you access its root URL (e.g., http://localhost:3000).
app.get('/', (req, res) => {
    res.send('Real Estate Backend API is alive!');
});

// --- Error Handling Middleware ---
// This is a catch-all middleware for handling any errors that occur in other routes or middleware.
// It prevents the server from crashing and provides a consistent error response.
app.use((err, req, res, next) => {
    console.error(err.stack); // Log the full error stack to the server console for debugging
    res.status(500).json({ message: 'Something went wrong on the server!', error: err.message }); // Send a more detailed error response
});

// --- Start the Server ---
// Make the Express app listen for incoming requests on the specified PORT.
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});