document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const appRoot = document.getElementById('app-root');
    const homePage = document.getElementById('home-page');
    const listingsPage = document.getElementById('listings-page');
    const propertyDetailPage = document.getElementById('property-detail-page');
    const detailContent = document.getElementById('detail-content');
    const contactPage = document.getElementById('contact-page');
    const faqPage = document.getElementById('faq-page');

    const homeLink = document.getElementById('home-link');
    const listingsLink = document.getElementById('listings-link');
    const contactLink = document.getElementById('contact-link');
    const faqLink = document.getElementById('faq-link');

    // ONLY one propertyListings element now
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

    // These search/filter inputs are global as they apply to `allProperties`
    const searchInput = document.getElementById('search-input'); // Main search bar on home page
    const searchButton = document.getElementById('search-button'); // Main search button on home page
    const filterLocationInput = document.getElementById('filter-location'); // Filter on listings page
    const filterMinPriceInput = document.getElementById('filter-min-price'); // Filter on listings page
    const filterMaxPriceInput = document.getElementById('filter-max-price'); // Filter on listings page
    const applyFiltersButton = document.getElementById('apply-filters'); // Button on listings page
    const clearFiltersButton = document.getElementById('clear-filters'); // Button on listings page

    // Contact Form elements
    const contactForm = document.getElementById('contact-form');
    const contactStatus = document.getElementById('contact-status');

    // --- API Base URL ---
    const API_BASE_URL = 'https://real-estate-backend-h76n.onrender.com'; // Your Render backend URL

    let allProperties = []; // To store all fetched properties for client-side filtering

    // --- Utility Function: Show/Hide Pages ---
    const showPage = (pageToShow) => {
        const pages = [homePage, listingsPage, propertyDetailPage, contactPage, faqPage];
        
        pages.forEach(page => {
            if (page) {
                page.classList.add('hidden'); // Hide all pages
            } else {
                console.error(`Error: Page element is null. Check HTML ID for one of these:`, {
                    homePage, listingsPage, propertyDetailPage, contactPage, faqPage
                });
            }
        });
        
        if (pageToShow) {
            pageToShow.classList.remove('hidden'); 
        } else {
            console.error(`Error: Target page to show is null. Check showPage call:`, pageToShow);
        }

        if (pageToShow !== propertyDetailPage) {
            if (detailContent) {
                detailContent.innerHTML = '<p>Loading property details...</p>';
            }
        }
    };

    // --- Navigation Event Listeners ---
    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(homePage);
        // Clear main search input on home page if returning home
        if (searchInput) searchInput.value = ''; 
    });

    listingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(listingsPage);
        fetchAndRenderProperties(); // Re-fetch and render all properties with filters
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
    // Now simplified as it always renders to propertyListings
    const renderProperties = (propertiesToRender) => {
        if (!propertyListings) {
            console.error("Error: 'property-listings' container not found in the DOM.");
            return;
        }

        propertyListings.innerHTML = ''; // Clear existing properties
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
            propertyListings.appendChild(card); // Append to the correct container
        });

        // Add event listeners for buttons on the listings page
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
        if (propertyListings) {
            propertyListings.innerHTML = '<p style="text-align: center;">Loading properties...</p>';
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/properties`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            allProperties = await response.json();
            console.log("Properties fetched successfully:", allProperties); 
            
            // On initial load or when navigating to listings, apply filters
            applySearchAndFilters(); 

        } catch (error) {
            console.error("Error fetching properties:", error);
            const errorMessage = '<p style="color: red; text-align: center;">Failed to load properties. Make sure your backend server is running and accessible at ' + API_BASE_URL + '/api/properties</p>';
            if (propertyListings) propertyListings.innerHTML = errorMessage;
        }
    };

    // --- Search & Filter Logic (Client-side) ---
    // This function now always applies all filters
    const applySearchAndFilters = () => {
        console.log("applySearchAndFilters is running!"); 
        let filtered = [...allProperties];
        console.log("Initial properties for filtering:", filtered); 

        // Get search term from the main search input (can be on home or listings page)
        const searchTerm = searchInput.value.toLowerCase().trim();
        console.log("Search Term from input:", searchTerm); 

        if (searchTerm) {
            filtered = filtered.filter(p =>
                (p.title && p.title.toLowerCase().includes(searchTerm)) ||
                (p.description && p.description.toLowerCase().includes(searchTerm)) ||
                (p.location && p.location.toLowerCase().includes(searchTerm))
            );
        }
        console.log("Properties after search filter:", filtered.length, filtered); 

        // Apply advanced filters (only if they exist on the page and have values)
        const filterLocation = filterLocationInput ? filterLocationInput.value.toLowerCase().trim() : '';
        console.log("Filter Location from input:", filterLocation); 
        if (filterLocation) {
            filtered = filtered.filter(p => p.location && p.location.toLowerCase().includes(filterLocation));
        }
        console.log("Properties after location filter:", filtered.length, filtered); 

        const minPrice = filterMinPriceInput ? parseFloat(filterMinPriceInput.value) : NaN;
        console.log("Min Price from input:", minPrice); 
        if (!isNaN(minPrice)) {
            filtered = filtered.filter(p => p.price >= minPrice);
        }
        console.log("Properties after min price filter:", filtered.length, filtered); 

        const maxPrice = filterMaxPriceInput ? parseFloat(filterMaxPriceInput.value) : NaN;
        console.log("Max Price from input:", maxPrice); 
        if (!isNaN(maxPrice)) {
            filtered = filtered.filter(p => p.price <= maxPrice);
        }
        console.log("Properties after max price filter:", filtered.length, filtered); 
        
        console.log("Final filtered properties to render:", filtered.length, filtered); 
        
        // Always render to propertyListings
        renderProperties(filtered);
    };

    // Event listener for the main search bar on the Home Page
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            // If Enter key is pressed while on the homepage search input
            if (e.key === 'Enter' && homePage && !homePage.classList.contains('hidden')) {
                e.preventDefault(); // Prevent default form submission if it were a form
                showPage(listingsPage); // Go to listings page
                applySearchAndFilters(); // Apply the search term from the home page input
            }
        });
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            // When search button is clicked on home page
            if (homePage && !homePage.classList.contains('hidden')) {
                showPage(listingsPage); // Go to listings page
                applySearchAndFilters(); // Apply the search term from the home page input
            } else {
                // If clicked on listings page, just apply filters
                applySearchAndFilters();
            }
        });
    }

    if (applyFiltersButton) applyFiltersButton.addEventListener('click', applySearchAndFilters);
    if (clearFiltersButton) {
        clearFiltersButton.addEventListener('click', () => {
            if (searchInput) searchInput.value = ''; // Clear main search too
            if (filterLocationInput) filterLocationInput.value = '';
            if (filterMinPriceInput) filterMinPriceInput.value = '';
            if (filterMaxPriceInput) filterMaxPriceInput.value = '';
            applySearchAndFilters(); // Clear all filters and re-apply
        });
    }

    // --- Property Detail View ---
    const viewPropertyDetails = async (id) => {
        if (!detailContent) {
            console.error("Error: 'detail-content' element not found.");
            return;
        }
        detailContent.innerHTML = '<p style="text-align: center;">Loading property details...</p>';
        showPage(propertyDetailPage);

        try {
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

            const detailBackButton = document.getElementById('detail-back-button');
            if (detailBackButton) {
                detailBackButton.addEventListener('click', () => {
                    showPage(listingsPage);
                    fetchAndRenderProperties();
                });
            }

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
            if (detailContent) {
                detailContent.innerHTML = '<p style="color: red; text-align: center;">Failed to load property details. Property may not exist or backend is down.</p>';
            }
        }
    };

    // --- Modals and Forms for Add/Edit ---
    const openPropertyModalForAdd = () => {
        if (propertyIdInput) propertyIdInput.value = '';
        if (propertyForm) propertyForm.reset();
        if (imagePreview) {
            imagePreview.src = '';
            imagePreview.classList.add('hidden');
        }
        if (propertyModal) propertyModal.classList.remove('hidden');
    };

    const openPropertyModalForEdit = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/properties/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const property = await response.json();
            if (propertyIdInput) propertyIdInput.value = property._id;
            if (titleInput) titleInput.value = property.title;
            if (descriptionInput) descriptionInput.value = property.description;
            if (priceInput) priceInput.value = property.price;
            if (locationInput) locationInput.value = property.location;
            
            if (imagePreview) {
                if (property.imageUrl && property.imageUrl.startsWith('http')) {
                    imagePreview.src = property.imageUrl;
                    imagePreview.classList.remove('hidden');
                } else {
                    imagePreview.src = '';
                    imagePreview.classList.add('hidden');
                }
            }
            if (imageFileInput) imageFileInput.value = '';

            if (propertyModal) propertyModal.classList.remove('hidden');
        } catch (error) {
            console.error("Error fetching property for edit:", error);
            alert("Could not load property for editing.");
        }
    };

    const closePropertyModal = () => {
        if (propertyModal) propertyModal.classList.add('hidden');
        if (imagePreview) {
            imagePreview.src = '';
            imagePreview.classList.add('hidden');
        }
        if (propertyForm) propertyForm.reset();
    };

    if (addPropertyBtn) addPropertyBtn.addEventListener('click', openPropertyModalForAdd);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closePropertyModal);

    // --- Image File Preview Listener ---
    if (imageFileInput) {
        imageFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (imagePreview) {
                        imagePreview.src = e.target.result;
                        imagePreview.classList.remove('hidden');
                    }
                };
                reader.readAsDataURL(file);
            } else {
                if (imagePreview) {
                    imagePreview.src = '';
                    imagePreview.classList.add('hidden');
                }
            }
        });
    }

    // --- Property Form Submission (Handles both Add and Edit with file upload) ---
    if (propertyForm) {
        propertyForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append('title', titleInput.value.trim());
            formData.append('description', descriptionInput.value.trim());
            formData.append('price', parseFloat(priceInput.value));
            formData.append('location', locationInput.value.trim());
            
            if (imageFileInput && imageFileInput.files[0]) {
                formData.append('image', imageFileInput.files[0]);
            }

            const propertyId = propertyIdInput.value;

            try {
                let response;
                let method = 'POST';
                let url = `${API_BASE_URL}/api/properties`;

                if (propertyId) {
                    method = 'PUT';
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
    }

    // --- Delete Property ---
    const deleteProperty = async (id) => {
        if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
            return;
        }
        try {
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

    // --- Contact Form Submission ---
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (contactStatus) contactStatus.textContent = 'Sending message...';
            try {
                const response = await fetch(`${API_BASE_URL}/api/contact`, { // Assuming you have a /api/contact endpoint
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: document.getElementById('contact-name').value,
                        email: document.getElementById('contact-email').value,
                        subject: document.getElementById('contact-subject').value,
                        message: document.getElementById('contact-message').value,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                if (contactStatus) {
                    contactStatus.textContent = 'Message sent successfully! We will get back to you soon.';
                    contactStatus.style.color = 'green';
                }
                contactForm.reset();
            } catch (error) {
                console.error('Error sending message:', error);
                if (contactStatus) {
                    contactStatus.textContent = 'Failed to send message. Please try again later.';
                    contactStatus.style.color = 'red';
                }
            }
        });
    }

    // --- Initial Load ---
    fetchAndRenderProperties(); // Still fetches all properties but renders based on active page
    showPage(homePage); // Always start on the home page
});
