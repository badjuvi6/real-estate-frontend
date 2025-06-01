document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const appRoot = document.getElementById('app-root');
    const homePage = document.getElementById('home-page');
    const listingsPage = document.getElementById('listings-page');
    const propertyDetailPage = document.getElementById('property-detail-page');
    const homeLink = document.getElementById('home-link');
    const listingsLink = document.getElementById('listings-link');
    const propertyListings = document.getElementById('property-listings');
    const addPropertyBtn = document.getElementById('add-property-btn');
    const propertyModal = document.getElementById('property-modal');
    const propertyForm = document.getElementById('property-form');
    const cancelModalBtn = document.getElementById('cancel-modal');
    const propertyIdInput = document.getElementById('property-id');
    const titleInput = document.getElementById('title');
    const descriptionInput = document.getElementById('description');
    const priceInput = document.getElementById('price');
    const locationInput = document.getElementById('location');
    const imageFileInput = document.getElementById('imageFile'); // Renamed from imageUrlInput
    const imagePreview = document.getElementById('imagePreview'); // New element for image preview
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const filterLocationInput = document.getElementById('filter-location');
    const filterMinPriceInput = document.getElementById('filter-min-price');
    const filterMaxPriceInput = document.getElementById('filter-max-price');
    const applyFiltersButton = document.getElementById('apply-filters');
    const clearFiltersButton = document.getElementById('clear-filters');

    // --- API Base URL ---
    // IMPORTANT: Make sure this matches the port your backend Express server is running on.
    // Default is 3000. If you deploy, this will change to your deployed backend URL.
    const API_BASE_URL = 'https://real-estate-backend-h76n.onrender.com';

    let allProperties = []; // To store all fetched properties for client-side filtering

    // --- Utility Function: Show/Hide Pages ---
    const showPage = (pageToShow) => {
        const pages = [homePage, listingsPage, propertyDetailPage];
        pages.forEach(page => page.classList.add('hidden')); // Hide all pages
        pageToShow.classList.remove('hidden'); // Show the target page
        // Clear any previous detail content when navigating away from detail page
        if (pageToShow !== propertyDetailPage) {
            propertyDetailPage.innerHTML = '<p>Loading property details...</p>';
        }
    };

    // --- Navigation Event Listeners ---
    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(homePage);
    });

    listingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(listingsPage);
        fetchAndRenderProperties(); // Refresh listings every time we go to the listings page
    });

    // --- Property Card Rendering Function ---
    const renderProperties = (propertiesToRender) => {
        propertyListings.innerHTML = ''; // Clear existing listings
        if (propertiesToRender.length === 0) {
            propertyListings.innerHTML = '<p class="no-properties-message">No properties found matching your criteria.</p>';
            return;
        }

        propertiesToRender.forEach(property => {
            const card = document.createElement('div');
            card.className = 'property-card';
            // Use property.imageUrl from database or a placeholder if not available or invalid
            const imageUrl = property.imageUrl && property.imageUrl.startsWith('http') ? property.imageUrl : 'https://via.placeholder.com/400x250?text=No+Image';

            card.innerHTML = `
                <img src="${imageUrl}" alt="${property.title}">
                <div class="property-card-content">
                    <h3>${property.title}</h3>
                    <p class="price">$${property.price ? property.price.toLocaleString() : 'N/A'}</p>
                    <p>${property.description.substring(0, 120)}${property.description.length > 120 ? '...' : ''}</p>
                    <p><strong>Location:</strong> ${property.location}</p>
                    <div class="actions">
                        <button class="view-details" data-id="${property._id}">View Details</button>
                        <button class="edit-property" data-id="${property._id}">Edit</button>
                        <button class="delete-property" data-id="${property._id}">Delete</button>
                    </div>
                </div>
            `;
            propertyListings.appendChild(card);
        });

        // Attach event listeners to newly created buttons using event delegation or direct selection
        // Direct selection for simplicity here, but delegation is better for many items.
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', (e) => viewPropertyDetails(e.target.dataset.id));
        });
        document.querySelectorAll('.edit-property').forEach(button => {
            button.addEventListener('click', (e) => openPropertyModalForEdit(e.target.dataset.id));
        });
        document.querySelectorAll('.delete-property').forEach(button => {
            button.addEventListener('click', (e) => deleteProperty(e.target.dataset.id));
        });
    };

    // --- Fetch Properties from Backend ---
    const fetchAndRenderProperties = async () => {
        propertyListings.innerHTML = '<p style="text-align: center;">Loading properties...</p>'; // Show loading message
        try {
            const response = await fetch(API_BASE_URL);
            if (!response.ok) {
                // If response is not 2xx, throw an error with status and text
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            allProperties = await response.json(); // Store all properties
            renderProperties(allProperties); // Render all initially
        } catch (error) {
            console.error("Error fetching properties:", error);
            propertyListings.innerHTML = '<p style="color: red; text-align: center;">Failed to load properties. Make sure your backend server is running and accessible at ' + API_BASE_URL + '</p>';
        }
    };

    // --- Search & Filter Logic (Client-side) ---
    const applySearchAndFilters = () => {
        let filtered = [...allProperties]; // Start with a copy of all properties

        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.title.toLowerCase().includes(searchTerm) ||
                p.description.toLowerCase().includes(searchTerm) ||
                p.location.toLowerCase().includes(searchTerm)
            );
        }

        const filterLocation = filterLocationInput.value.toLowerCase().trim();
        if (filterLocation) {
            filtered = filtered.filter(p => p.location.toLowerCase().includes(filterLocation));
        }

        const minPrice = parseFloat(filterMinPriceInput.value);
        if (!isNaN(minPrice)) {
            filtered = filtered.filter(p => p.price >= minPrice);
        }

        const maxPrice = parseFloat(filterMaxPriceInput.value);
        if (!isNaN(maxPrice)) {
            filtered = filtered.filter(p => p.price <= maxPrice);
        }

        renderProperties(filtered); // Re-render with filtered results
    };

    searchButton.addEventListener('click', applySearchAndFilters);
    applyFiltersButton.addEventListener('click', applySearchAndFilters);
    clearFiltersButton.addEventListener('click', () => {
        searchInput.value = '';
        filterLocationInput.value = '';
        filterMinPriceInput.value = '';
        filterMaxPriceInput.value = '';
        applySearchAndFilters(); // Re-apply to show all properties (clears filters)
    });


    // --- Property Detail View ---
    const viewPropertyDetails = async (id) => {
        propertyDetailPage.innerHTML = '<p style="text-align: center;">Loading property details...</p>'; // Show loading message
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const property = await response.json();
            // Use property.imageUrl from database or a placeholder if not available or invalid
            const imageUrl = property.imageUrl && property.imageUrl.startsWith('http') ? property.imageUrl : 'https://via.placeholder.com/800x400?text=No+Image';

            propertyDetailPage.innerHTML = `
                <div class="detail-card">
                    <h2>${property.title}</h2>
                    <img src="${imageUrl}" alt="${property.title}">
                    <p><strong>Price:</strong> $${property.price ? property.price.toLocaleString() : 'N/A'}</p>
                    <p><strong>Location:</strong> ${property.location}</p>
                    <p class="detail-description">${property.description}</p>
                    <button class="action-button back-to-listings" onclick="window.history.back()">Back to Listings</button>
                    </div>
            `;
            showPage(propertyDetailPage);
        } catch (error) {
            console.error("Error fetching property details:", error);
            propertyDetailPage.innerHTML = '<p style="color: red; text-align: center;">Failed to load property details. Property may not exist or backend is down.</p>';
        }
    };

    // --- Modals and Forms for Add/Edit ---
    const openPropertyModalForAdd = () => {
        propertyIdInput.value = ''; // Clear ID for new property
        propertyForm.reset(); // Clear all form fields
        imagePreview.src = ''; // Clear image preview source
        imagePreview.classList.add('hidden'); // Hide image preview element
        propertyModal.classList.remove('hidden'); // Show modal
    };

    const openPropertyModalForEdit = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const property = await response.json();
            // Populate form fields with existing property data
            propertyIdInput.value = property._id;
            titleInput.value = property.title;
            descriptionInput.value = property.description;
            priceInput.value = property.price;
            locationInput.value = property.location;
            
            // Set image preview if an image URL exists from the database
            if (property.imageUrl && property.imageUrl.startsWith('http')) {
                imagePreview.src = property.imageUrl;
                imagePreview.classList.remove('hidden');
            } else {
                imagePreview.src = '';
                imagePreview.classList.add('hidden');
            }
            // IMPORTANT: Clear file input value to avoid sending the old file data
            // if the user doesn't select a new file.
            imageFileInput.value = '';

            propertyModal.classList.remove('hidden'); // Show modal
        } catch (error) {
            console.error("Error fetching property for edit:", error);
            alert("Could not load property for editing.");
        }
    };

    const closePropertyModal = () => {
        propertyModal.classList.add('hidden'); // Hide modal
        imagePreview.src = ''; // Clear preview on close
        imagePreview.classList.add('hidden'); // Hide preview on close
        propertyForm.reset(); // Reset form state
    };

    addPropertyBtn.addEventListener('click', openPropertyModalForAdd);
    cancelModalBtn.addEventListener('click', closePropertyModal);

    // --- Image File Preview Listener ---
    // This allows the user to see a local preview of the image they selected before uploading.
    imageFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0]; // Get the first selected file
        if (file) {
            const reader = new FileReader(); // FileReader object to read the file content
            reader.onload = (e) => {
                imagePreview.src = e.target.result; // Set the image preview source to the Data URL
                imagePreview.classList.remove('hidden'); // Show the image preview element
            };
            reader.readAsDataURL(file); // Read the file as a Data URL (Base64 encoded string)
        } else {
            // If no file is selected, clear and hide the preview
            imagePreview.src = '';
            imagePreview.classList.add('hidden');
        }
    });

    // --- Property Form Submission (Handles both Add and Edit with file upload) ---
    propertyForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission (which would reload the page)

        // Create a FormData object. This is essential for sending files along with text data.
        const formData = new FormData();
        formData.append('title', titleInput.value.trim());
        formData.append('description', descriptionInput.value.trim());
        formData.append('price', parseFloat(priceInput.value)); // Ensure price is a number
        formData.append('location', locationInput.value.trim());
        
        // Append the selected image file to the FormData object if a file is chosen.
        // The name 'image' here must match the field name 'image' that Multer expects in the backend.
        if (imageFileInput.files[0]) {
            formData.append('image', imageFileInput.files[0]);
        }

        const propertyId = propertyIdInput.value; // Check if it's an edit (ID present) or add (ID empty) operation

        try {
            let response;
            let method = 'POST'; // Default to POST for new property
            let url = API_BASE_URL; // Default URL for new property

            if (propertyId) {
                method = 'PUT'; // Change method to PUT for updating existing property
                url = `${API_BASE_URL}/${propertyId}`; // Append ID for specific property update
            }

            // For FormData, you DO NOT set 'Content-Type': 'application/json' header.
            // The browser will automatically set the correct 'Content-Type': 'multipart/form-data'
            // with the necessary boundary.
            response = await fetch(url, {
                method: method,
                body: formData, // Send the FormData object directly as the body
            });

            if (!response.ok) {
                // Attempt to parse error response as JSON for more details
                const errorBody = await response.json();
                throw new Error(`HTTP error! Status: ${response.status}. Message: ${errorBody.message || 'Unknown error.'}`);
            }

            closePropertyModal(); // Close modal on successful operation
            fetchAndRenderProperties(); // Re-fetch and display updated/new listings
            alert(`Property ${propertyId ? 'updated' : 'added'} successfully!`); // Show success message
        } catch (error) {
            console.error("Error saving property:", error);
            alert(`Failed to save property: ${error.message}`); // Show alert with error details
        }
    });

    // --- Delete Property ---
    const deleteProperty = async (id) => {
        if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
            return; // User cancelled the deletion
        }
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE', // Use DELETE HTTP method
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`HTTP error! Status: ${response.status}. Message: ${errorBody.message || 'Unknown error.'}`);
            }

            fetchAndRenderProperties(); // Refresh listings after successful deletion
            alert('Property deleted successfully!');
        } catch (error) {
            console.error("Error deleting property:", error);
            alert(`Failed to delete property: ${error.message}`);
        }
    };

    // --- Initial Load ---
    fetchAndRenderProperties(); // Load properties when the page first loads
    showPage(homePage); // Display the home page by default
});
