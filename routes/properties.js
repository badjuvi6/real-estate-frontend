// real-estate-app/backend/routes/properties.js

const express = require('express');
const router = express.Router(); // Create a new Express router instance
const Property = require('../models/Property'); // Import the Property Mongoose model
const cloudinary = require('cloudinary').v2; // Import Cloudinary v2 for upload operations
const multer = require('multer'); // Import Multer for handling multipart/form-data (file uploads)

// --- Multer Configuration for File Uploads ---
// Configures Multer to store uploaded files in memory as buffers.
// This is suitable when immediately sending files to a cloud storage service like Cloudinary.
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Set file size limit to 5 MB (5 * 1024 * 1024 bytes)
    fileFilter: (req, file, cb) => {
        // Basic file type validation: only allow image files.
        if (file.mimetype.startsWith('image/')) {
            cb(null, true); // Accept the file
        } else {
            // Reject the file and provide an error message
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// --- API Endpoints for Property Management (CRUD Operations) ---

// 1. GET all properties: /api/properties
// Fetches all property listings from the database.
router.get('/', async (req, res) => {
    try {
        // Find all documents in the 'properties' collection and sort them by 'createdAt' in descending order (newest first).
        const properties = await Property.find().sort({ createdAt: -1 });
        res.json(properties); // Send the retrieved properties as a JSON array in the response.
    } catch (err) {
        // If an error occurs during the database operation, send a 500 (Internal Server Error) status
        // along with a JSON object containing the error message.
        res.status(500).json({ message: err.message });
    }
});

// 2. GET a single property by ID: /api/properties/:id
// Fetches a specific property listing using its unique MongoDB ID.
router.get('/:id', async (req, res) => {
    try {
        // Find a property document by its ID, which is extracted from the URL parameters (req.params.id).
        const property = await Property.findById(req.params.id);
        if (!property) {
            // If no property is found with the given ID, send a 404 (Not Found) status.
            return res.status(404).json({ message: 'Property not found' });
        }
        res.json(property); // Send the found property as JSON.
    } catch (err) {
        // Handle potential errors like invalid ID format or database issues.
        res.status(500).json({ message: err.message });
    }
});

// 3. POST a new property: /api/properties
// Creates a new property listing, handling image upload to Cloudinary.
// `upload.single('image')` is a Multer middleware that processes a single file upload
// from a form field named 'image'. The file data will be available in `req.file`.
router.post('/', upload.single('image'), async (req, res) => {
    let imageUrl = ''; // Initialize imageUrl to an empty string

    // Check if a file was uploaded via the 'image' field
    if (req.file) {
        try {
            // Upload the image buffer (from memory storage) to Cloudinary.
            // The `data:` URI scheme is used to represent the buffer as a file.
            const result = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
                folder: 'realestate_listings_app' // Optional: Organize uploads into a specific folder on Cloudinary
            });
            imageUrl = result.secure_url; // Cloudinary returns a secure URL for the uploaded image
        } catch (uploadError) {
            console.error("Cloudinary upload error:", uploadError);
            // If image upload fails, return a 500 error and prevent property creation
            return res.status(500).json({ message: 'Image upload failed: ' + uploadError.message });
        }
    }

    // Create a new Property instance using data from the request body (text fields)
    // and the obtained imageUrl (from Cloudinary or empty if no file was uploaded).
    const property = new Property({
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        location: req.body.location,
        imageUrl: imageUrl // Store the Cloudinary URL in the database
    });

    try {
        // Save the new property document to the MongoDB database.
        const newProperty = await property.save();
        // Respond with a 201 (Created) status code and the data of the newly created property.
        res.status(201).json(newProperty);
    } catch (err) {
        // If validation fails (e.g., a 'required' field is missing), Mongoose throws an error.
        // Send a 400 (Bad Request) status with the error message.
        res.status(400).json({ message: err.message });
    }
});

// 4. PUT (Update) an existing property: /api/properties/:id
// Updates an existing property listing, also handling image re-upload if a new file is provided.
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        // Find the property by ID that needs to be updated.
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Handle image update if a new file is provided in the request
        if (req.file) {
            try {
                // Optional: If you want to delete the old image from Cloudinary,
                // you would need to store the `public_id` returned by Cloudinary during initial upload
                // in your MongoDB model. Then use `cloudinary.uploader.destroy(publicId)`.
                // For simplicity here, we're just uploading a new one and updating the URL.
                const result = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
                    folder: 'realestate_listings_app' // Same folder as during creation
                });
                property.imageUrl = result.secure_url; // Update property's imageUrl with the new Cloudinary URL
            } catch (uploadError) {
                console.error("Cloudinary re-upload error:", uploadError);
                return res.status(500).json({ message: 'Image update failed: ' + uploadError.message });
            }
        }
        // IMPORTANT: If no new file is uploaded (`req.file` is null), the `imageUrl` in the database
        // remains unchanged. If you want to allow *clearing* an image without uploading a new one,
        // you'd need a separate mechanism (e.g., a "Clear Image" checkbox/button on frontend).

        // Update other property fields if new values are provided in the request body.
        // Using `!= null` checks for both `undefined` and `null`, allowing empty strings for fields like title if needed.
        if (req.body.title != null) property.title = req.body.title;
        if (req.body.description != null) property.description = req.body.description;
        // For price, explicitly check `!== undefined` to allow updating to 0.
        if (req.body.price !== undefined) property.price = req.body.price;
        if (req.body.location != null) property.location = req.body.location;

        // Save the updated property document. The pre-save hook in the model will update 'updatedAt'.
        const updatedProperty = await property.save();
        res.json(updatedProperty); // Send the updated property data as JSON.
    } catch (err) {
        // Send a 400 (Bad Request) for validation errors during the update process.
        res.status(400).json({ message: err.message });
    }
});

// 5. DELETE a property: /api/properties/:id
// Deletes a property listing identified by its ID.
router.delete('/:id', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Optional: Delete the image from Cloudinary when the property is deleted.
        // This requires storing the Cloudinary 'public_id' in your MongoDB model
        // when the image is first uploaded.
        // if (property.imageUrl && property.imageUrl.includes('res.cloudinary.com')) {
        //     // Example: Extract public_id from Cloudinary URL (adjust based on your URL structure)
        //     const publicId = property.imageUrl.split('/').pop().split('.')[0]; // basic extraction
        //     await cloudinary.uploader.destroy(`realestate_listings_app/${publicId}`); // Delete from Cloudinary
        //     console.log('Deleted image from Cloudinary:', publicId);
        // }

        // Delete the property document from MongoDB
        await Property.findByIdAndDelete(req.params.id);
        res.json({ message: 'Property deleted successfully' }); // Confirm successful deletion.
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router; // Export the router to be used by server.js