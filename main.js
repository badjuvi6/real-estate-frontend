document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const appRoot = document.getElementById('app-root');
    const homePage = document.getElementById('home-page');
    const listingsPage = document.getElementById('listings-page');
    const propertyDetailPage = document.getElementById('property-detail-page');
    const detailContent = document.getElementById('detail-content'); // Crucial: Get the specific div inside property-detail-page
    const contactPage = document.getElementById('contact-page');
    const faqPage = document.getElementById('faq-page');
    const homeLink = document.getElementById('home-link');
    const listingsLink = document.getElementById('listings-link');
    const contactLink = document.getElementById('contact-link');
    const faqLink = document.getElementById('faq-link');
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
    const imageFileInput = document.getElementById('imageFile');
    const imagePreview = document.getElementById('imagePreview');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const filterLocationInput = document.getElementById('filter-location');
    const filterMinPriceInput = document.getElementById('filter-min-price');
    const filterMaxPriceInput = document.getElementById('filter-max-price');
    const applyFiltersButton = document.getElementById('apply-filters');
    const clearFiltersButton = document.getElementById('clear-filters');

    // Contact Form elements
    const contactForm = document.getElementById('contact-form');
    const contactStatus = document.getElementById('contact-status');

    // --- API Base URL ---
    // IMPORTANT: Make sure this is your Render backend's base URL.
    const API_BASE_URL = 'https://real-estate-backend-h76n.onrender.com';

    let allProperties = []; // To store all fetched properties for client-side filtering

    // --- Utility Function: Show/Hide Pages ---
    const showPage = (pageToShow) => {
        // All known page sections
        const pages = [homePage, listingsPage, propertyDetailPage, contactPage, faqPage];
        
        // Ensure all page references are valid before trying to use classList
        // If any of these are null, it means the corresponding HTML element is missing.
        // This log helps debug if the issue persists.
        pages.forEach(page => {
            if (page) {
                page.classList.add('hidden'); // Hide all pages
            } else {
                console.error(`Error: Page element is null. Check HTML ID for one of these:`, {
                    homePage, listingsPage, propertyDetailPage, contactPage, faqPage
                });
            }
        });
        
        // Show the target page, only if it's not null
        if (pageToShow) {
            pageToShow.classList.remove('hidden'); 
        } else {
             console.error(`Error: Target page to show is null. Check showPage call:`, pageToShow);
        }

        // Clear any previous detail content when navigating away from detail page
        if (pageToShow !== propertyDetailPage) {
            // Ensure detailContent is not null before trying to set innerHTML
            if (detailContent) {
                detailContent.innerHTML = '<p>Loading property details...</p>';
            }
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

    if (contactLink) {
        contactLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(contactPage);
            if (contactStatus) {
                contactStatus.textContent = '';
                contactForm.reset();
            }
        });
    }

    if (faqLink) {
        faqLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(faqPage);
        });
    }

    // --- Property Card Rendering Function ---
    const renderProperties = (propertiesToRender) => {
        propertyListings.innerHTML = '';
        if (propertiesToRender.length === 0) {
            propertyListings.innerHTML = '<p class="no-properties-message">No properties found matching your criteria.</p>';
            return;
        }

        propertiesToRender.forEach(property => {
            const card = document.createElement('div');
            card.className = 'property-card';
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
        propertyListings.innerHTML = '<p style="text-align: center;">Loading properties...</p>';
        try {
            const response = await fetch(`${API_BASE_URL}/api/properties`); // Corrected path
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            allProperties = await response.json();
            renderProperties(allProperties);
        } catch (error) {
            console.error("Error fetching properties:", error);
            propertyListings.innerHTML = '<p style="color: red; text-align: center;">Failed to load properties. Make sure your backend server is running and accessible at ' + API_BASE_URL + '/api/properties</p>';
        }
    };

    // --- Search & Filter Logic (Client-side) ---
    const applySearchAndFilters = () => {
        let filtered = [...allProperties];

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

        renderProperties(filtered);
    };

    searchInput.addEventListener('input', applySearchAndFilters);
    searchButton.addEventListener('click', applySearchAndFilters);
    applyFiltersButton.addEventListener('click', applySearchAndFilters);
    clearFiltersButton.addEventListener('click', () => {
        searchInput.value = '';
        filterLocationInput.value = '';
        filterMinPriceInput.value = '';
        filterMaxPriceInput.value = '';
        applySearchAndFilters();
    });

    // --- Property Detail View ---
    const viewPropertyDetails = async (id) => {
        // Clear content before loading new details
        detailContent.innerHTML = '<p style="text-align: center;">Loading property details...</p>';
        showPage(propertyDetailPage); // Show the detail page container immediately

        try {
            // Corrected: Ensure API path includes /api/properties
            const response = await fetch(`${API_BASE_URL}/api/properties/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const property = await response.json();
            
            const imageUrl = property.imageUrl && property.imageUrl.startsWith('http') ? property.imageUrl : 'https://via.placeholder.com/800x400?text=No+Image';

            detailContent.innerHTML = `
                <div class="detail-card">
                    <button class="action-button back-to-listings" id="detail-back-button">← Back to Listings</button>
                    <h2>${property.title}</h2>
                    <img src="${imageUrl}" alt="${property.title}" class="detail-image">
                    <p><strong>Price:</strong> $${property.price ? property.price.toLocaleString() : 'N/A'}</p>
                    <p><strong>Location:</strong> ${property.location}</p>
                    <p class="detail-description">${property.description}</p>
                    <button id="contact-agent-btn" class="action-button contact-button">Contact Agent</button>
                </div>
            `;

            // Add event listener for the "Back to Listings" button on the detail page
            const detailBackButton = document.getElementById('detail-back-button');
            if (detailBackButton) {
                detailBackButton.addEventListener('click', () => {
                    showPage(listingsPage);
                    fetchAndRenderProperties();
                });
            }

            // Add event listener for the contact button
            const contactAgentBtn = document.getElementById('contact-agent-btn');
            if (contactAgentBtn) {
                contactAgentBtn.addEventListener('click', () => {
                    showPage(contactPage);
                    const contactSubjectInput = document.getElementById('contact-subject');
                    const contactMessageInput = document.getElementById('contact-message');
                    if (contactSubjectInput) contactSubjectInput.value = `Inquiry about: ${property.title}`;
                    if (contactMessageInput) contactMessageInput.value = `Hello, I am interested in the property located at ${property.location} (ID: ${property._id}). Please provide more information.`;
                });
            }

        } catch (error) {
            console.error("Error fetching property details:", error);
            detailContent.innerHTML = '<p style="color: red; text-align: center;">Failed to load property details. Property may not exist or backend is down.</p>';
        }
    };

    // --- Modals and Forms for Add/Edit ---
    const openPropertyModalForAdd = () => {
        propertyIdInput.value = '';
        propertyForm.reset();
        imagePreview.src = '';
        imagePreview.classList.add('hidden');
        propertyModal.classList.remove('hidden');
    };

    const openPropertyModalForEdit = async (id) => {
        try {
            // Corrected: Ensure API path includes /api/properties
            const response = await fetch(`${API_BASE_URL}/api/properties/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const property = await response.json();
            propertyIdInput.value = property._id;
            titleInput.value = property.title;
            descriptionInput.value = property.description;
            priceInput.value = property.price;
            locationInput.value = property.location;
            
            if (property.imageUrl && property.imageUrl.startsWith('http')) {
                imagePreview.src = property.imageUrl;
                imagePreview.classList.remove('hidden');
            } else {
                imagePreview.src = '';
                imagePreview.classList.add('hidden');
            }
            imageFileInput.value = '';

            propertyModal.classList.remove('hidden');
        } catch (error) {
            console.error("Error fetching property for edit:", error);
            alert("Could not load property for editing.");
        }
    };

    const closePropertyModal = () => {
        propertyModal.classList.add('hidden');
        imagePreview.src = '';
        imagePreview.classList.add('hidden');
        propertyForm.reset();
    };

    addPropertyBtn.addEventListener('click', openPropertyModalForAdd);
    cancelModalBtn.addEventListener('click', closePropertyModal);

    // --- Image File Preview Listener ---
    imageFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.src = '';
            imagePreview.classList.add('hidden');
        }
    });

    // --- Property Form Submission (Handles both Add and Edit with file upload) ---
    propertyForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('title', titleInput.value.trim());
        formData.append('description', descriptionInput.value.trim());
        formData.append('price', parseFloat(priceInput.value));
        formData.append('location', locationInput.value.trim());
        
        if (imageFileInput.files[0]) {
            formData.append('image', imageFileInput.files[0]);
        }

        const propertyId = propertyIdInput.value;

        try {
            let response;
            let method = 'POST';
            // Corrected: URL for POST (add) should be /api/properties
            let url = `${API_BASE_URL}/api/properties`;

            if (propertyId) {
                method = 'PUT';
                // Corrected: URL for PUT (edit) should be /api/properties/:id
                url = `${API_BASE_URL}/api/properties/${propertyId}`;
            }

            response = await fetch(url, {
                method: method,
                body: formData,
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`HTTP error! Status: ${response.status}. Message: ${errorBody.message || 'Unknown error.'}`);
            }

            closePropertyModal();
            fetchAndRenderProperties();
            alert(`Property ${propertyId ? 'updated' : 'added'} successfully!`);
        } catch (error) {
            console.error("Error saving property:", error);
            alert(`Failed to save property: ${error.message}`);
        }
    });

    // --- Delete Property ---
    const deleteProperty = async (id) => {
        if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
            return;
        }
        try {
            // Corrected: URL for DELETE should be /api/properties/:id
            const response = await fetch(`${API_BASE_URL}/api/properties/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`HTTP error! Status: ${response.status}. Message: ${errorBody.message || 'Unknown error.'}`);
            }

            fetchAndRenderProperties();
            alert('Property deleted successfully!');
        } catch (error) {
            console.error("Error deleting property:", error);
            alert(`Failed to delete property: ${error.message}`);
        }
    };

    // --- Initial Load ---
    fetchAndRenderProperties();
    showPage(homePage);
});
