// real-estate-app/backend/models/Property.js

const mongoose = require('mongoose');

// Define the schema for a real estate property document.
// This outlines the fields, their data types, and validation rules for documents in your MongoDB collection.
const propertySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true, // Title is a mandatory field
        trim: true      // Automatically remove leading/trailing whitespace from the title
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0,         // Price must be a non-negative number
        // 'set' transform function: ensures price has at most two decimal places for consistency
        set: v => Math.round(v * 100) / 100
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    imageUrl: {
        type: String,
        // Default placeholder image URL if no image URL is provided during creation.
        // This ensures every property always has an image to display on the frontend.
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now // Automatically sets the creation timestamp when a new property is added
    },
    updatedAt: {
        type: Date,
        default: Date.now // Automatically sets the update timestamp; will be modified by pre-save hook
    }
});

// Mongoose pre-save hook:
// This middleware function runs automatically *before* a document is saved (both on creation and update).
// It ensures that the `updatedAt` field is always set to the current date and time.
propertySchema.pre('save', function(next) {
    this.updatedAt = Date.now(); // Set updatedAt to the current time
    next(); // Proceed to the next middleware or save operation
});

// Create the Mongoose model from the schema.
// 'Property' will be the singular name of the model. Mongoose will automatically
// create a collection named 'properties' (pluralized) in your MongoDB database.
const Property = mongoose.model('Property', propertySchema);

module.exports = Property; // Export the Property model so it can be used in other files (e.g., routes)