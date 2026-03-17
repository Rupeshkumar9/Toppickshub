
   /* ============================================
   TopPicksHub — Product Data Store
   ============================================
   Add new products to this array.
   The homepage automatically displays them
   sorted by dateAdded (newest first).
   ============================================ */
// imported the json data as array which contain product datils, new product can be added after updating "products.json" file
import PRODUCTS from './products.json' with { type: 'json' };

document.addEventListener('DOMContentLoaded', () => {

    // ---------- UTILITY: Generate star HTML ----------
    function getStarsHTML(rating) {
        let html = '';
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5 ? 1 : 0;
        const empty = 5 - full - half;
        for (let i = 0; i < full; i++) html += '<i class="bi bi-star-fill"></i>';
        if (half) html += '<i class="bi bi-star-half"></i>';
        for (let i = 0; i < empty; i++) html += '<i class="bi bi-star"></i>';
        return html;
    }

    // ---------- UTILITY: Calculate savings ----------
    function getSavePercent(price, originalPrice) {
        return Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    // ---------- UTILITY: Format number with commas ----------
    function formatNumber(n) {
        return n.toLocaleString();
    }

    // ---------- UTILITY: Generate a product card HTML ----------
    function createProductCardHTML(product) {
        const badgeHTML = product.badge
            ? `<div class="product-badge ${product.badgeClass || ''}">${product.badge}</div>`
            : '';
        const savePercent = getSavePercent(product.price, product.originalPrice);

        return `
            <div class="col-lg-4 col-md-6 reveal-card">
                <a href="product.html?id=${product.id}" class="product-card-link text-decoration-none">
                    <div class="product-card h-100">
                        ${badgeHTML}
                        <div class="product-img-wrapper">
                            <img src="${product.image}" alt="${product.title}" class="product-img" loading="lazy">
                        </div>
                        <div class="product-body">
                            <div class="product-category">${product.category}</div>
                            <h5 class="product-title">${product.title}</h5>
                            <div class="product-rating">
                                ${getStarsHTML(product.rating)}
                                <span class="ms-1 text-muted">(${formatNumber(product.reviews)})</span>
                            </div>
                            <div class="product-price">
                                <span class="price-current">$${product.price.toFixed(2)}</span>
                                <span class="price-original">$${product.originalPrice.toFixed(2)}</span>
                                <span class="price-save">Save ${savePercent}%</span>
                            </div>
                            <span class="btn btn-amazon w-100">
                                <i class="bi bi-eye-fill me-2"></i>View Details
                            </span>
                        </div>
                    </div>
                </a>
            </div>`;
    }


    // ==============================================
    //  SEARCH FORM HANDLER (works on ALL pages)
    // ==============================================
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query.length > 0) {
                window.location.href = `product.html?search=${encodeURIComponent(query)}`;
            }
        });
    }


    // ==============================================
    //  HOME PAGE — Dynamic Product Grid
    // ==============================================
    const productGrid = document.getElementById('productGrid');

    if (productGrid && typeof PRODUCTS !== 'undefined') {
        // Sort by dateAdded (newest first) and take up to 6
        const sorted = [...PRODUCTS].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        const latest = sorted.slice(0, 6);

        productGrid.innerHTML = latest.map(p => createProductCardHTML(p)).join('');

        // Re-run reveal observer on dynamically created cards
        initRevealCards();
    }


    // ==============================================
    //  PRODUCT DETAIL PAGE
    // ==============================================
    const productContent = document.getElementById('productContent');
    const allProductsListing = document.getElementById('allProductsListing');

    if (productContent && typeof PRODUCTS !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('id');

        if (!productId) {
            // ======= NO ?id param → Show ALL products or SEARCH results =======
            productContent.classList.add('d-none');
            document.getElementById('productBreadcrumb').closest('nav').classList.add('d-none');

            const searchQuery = params.get('search') ? params.get('search').trim() : '';

            // Pre-fill search input with query
            if (searchQuery && searchInput) {
                searchInput.value = searchQuery;
            }

            // Update page title
            document.title = searchQuery
                ? `Search: "${searchQuery}" — TopPicksHub`
                : 'All Products — TopPicksHub';

            if (allProductsListing) {
                allProductsListing.classList.remove('d-none');
                const PRODUCTS_PER_PAGE = 10;
                const currentPage = parseInt(params.get('page')) || 1;

                // Sort newest first
                let filteredProducts = [...PRODUCTS].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

                // Apply search filter if query exists
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    filteredProducts = filteredProducts.filter(p =>
                        p.title.toLowerCase().includes(q) ||
                        p.category.toLowerCase().includes(q) ||
                        p.description.toLowerCase().includes(q) ||
                        (p.features && p.features.some(f => f.toLowerCase().includes(q)))
                    );
                }

                // Update header text for search results
                const listingBadge = allProductsListing.querySelector('.section-badge');
                const listingHeading = allProductsListing.querySelector('.section-heading');
                const listingDesc = allProductsListing.querySelector('p.text-muted');

                if (searchQuery) {
                    if (listingBadge) listingBadge.textContent = 'SEARCH RESULTS';
                    if (listingHeading) listingHeading.textContent = filteredProducts.length > 0
                        ? `${filteredProducts.length} result${filteredProducts.length !== 1 ? 's' : ''} for "${searchQuery}"`
                        : `No results for "${searchQuery}"`;
                    if (listingDesc) listingDesc.textContent = filteredProducts.length > 0
                        ? 'Showing products matching your search.'
                        : 'Try a different keyword or browse all products.';
                } else {
                    if (listingBadge) listingBadge.textContent = 'ALL PRODUCTS';
                    if (listingHeading) listingHeading.textContent = 'Our Product Collection';
                    if (listingDesc) listingDesc.textContent = 'Browse our complete collection of reviewed products, sorted from newest to oldest.';
                }

                const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
                const safePage = Math.max(1, Math.min(currentPage, totalPages || 1));

                // Get products for this page
                const startIdx = (safePage - 1) * PRODUCTS_PER_PAGE;
                const pageProducts = filteredProducts.slice(startIdx, startIdx + PRODUCTS_PER_PAGE);

                // Render product cards
                const allProductsGrid = document.getElementById('allProductsGrid');
                if (allProductsGrid) {
                    if (pageProducts.length > 0) {
                        allProductsGrid.innerHTML = pageProducts.map(p => createProductCardHTML(p)).join('');
                    } else {
                        allProductsGrid.innerHTML = `
                            <div class="col-12 text-center py-5">
                                <i class="bi bi-search display-1 text-muted mb-3 d-block"></i>
                                <h4 class="text-muted">No products found</h4>
                                <p class="text-muted mb-4">We couldn't find any products matching your search.</p>
                                <a href="product.html" class="btn btn-glow px-4">
                                    <i class="bi bi-grid-fill me-2"></i>Browse All Products
                                </a>
                            </div>`;
                    }
                    initRevealCards();
                }

                // Build pagination base URL (preserve search param)
                const paginationBase = searchQuery
                    ? `product.html?search=${encodeURIComponent(searchQuery)}&page=`
                    : `product.html?page=`;

                // Render pagination (only if more than 1 page)
                const paginationEl = document.getElementById('productsPagination');
                if (paginationEl && totalPages > 1) {
                    let paginationHTML = '';

                    // Previous button
                    paginationHTML += `
                        <li class="page-item ${safePage === 1 ? 'disabled' : ''}">
                            <a class="page-link" href="${paginationBase}${safePage - 1}" aria-label="Previous">
                                <i class="bi bi-chevron-left"></i>
                            </a>
                        </li>`;

                    // Page numbers
                    for (let i = 1; i <= totalPages; i++) {
                        paginationHTML += `
                            <li class="page-item ${i === safePage ? 'active' : ''}">
                                <a class="page-link" href="${paginationBase}${i}">${i}</a>
                            </li>`;
                    }

                    // Next button
                    paginationHTML += `
                        <li class="page-item ${safePage === totalPages ? 'disabled' : ''}">
                            <a class="page-link" href="${paginationBase}${safePage + 1}" aria-label="Next">
                                <i class="bi bi-chevron-right"></i>
                            </a>
                        </li>`;

                    paginationEl.innerHTML = paginationHTML;
                } else if (paginationEl) {
                    paginationEl.innerHTML = '';
                }
            }

        } else {
            // ======= Has ?id → Find and show product detail =======
            const product = PRODUCTS.find(p => p.id === productId);

            if (product) {
                // Update page title
                document.title = `${product.title} — TopPicksHub`;

                // Update meta description
                const metaDesc = document.querySelector('meta[name="description"]');
                if (metaDesc) metaDesc.setAttribute('content', product.description.substring(0, 155) + '...');

                // Update breadcrumb
                const breadcrumbCategory = document.getElementById('breadcrumbCategory');
                const breadcrumbProduct = document.getElementById('breadcrumbProduct');
                if (breadcrumbCategory) breadcrumbCategory.innerHTML = `<a href="index.html#categories">${product.category}</a>`;
                if (breadcrumbProduct) breadcrumbProduct.textContent = product.title;

                // Calculate savings
                const savePercent = getSavePercent(product.price, product.originalPrice);
                const saveAmount = (product.originalPrice - product.price).toFixed(2);

                // Features list
                const featuresHTML = product.features.map(f => `
                    <li class="d-flex align-items-start gap-2 mb-2">
                        <i class="bi bi-check-circle-fill text-success mt-1"></i>
                        <span>${f}</span>
                    </li>`).join('');

                // Render product content
                productContent.innerHTML = `
                    <div class="row g-5">
                        <div class="col-lg-6">
                            <div class="detail-img-wrapper">
                                ${product.badge ? `<div class="product-badge ${product.badgeClass || ''}">${product.badge}</div>` : ''}
                                <img src="${product.image}" alt="${product.title}" class="detail-img img-fluid" id="mainProductImg">
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="detail-info">
                                <span class="product-category">${product.category}</span>
                                <h1 class="detail-title">${product.title}</h1>
                                <div class="detail-rating d-flex align-items-center gap-2 mb-3">
                                    <div class="product-rating mb-0">
                                        ${getStarsHTML(product.rating)}
                                    </div>
                                    <span class="text-muted">${product.rating} out of 5</span>
                                    <span class="text-muted">•</span>
                                    <span class="text-muted">${formatNumber(product.reviews)} reviews</span>
                                </div>
                                <div class="detail-price-box mb-4">
                                    <div class="d-flex align-items-baseline gap-3 flex-wrap">
                                        <span class="detail-price-current">$${product.price.toFixed(2)}</span>
                                        <span class="price-original fs-5">$${product.originalPrice.toFixed(2)}</span>
                                    </div>
                                    <div class="detail-savings mt-1">
                                        <i class="bi bi-tag-fill me-1"></i>You save $${saveAmount} (${savePercent}%)
                                    </div>
                                </div>
                                <p class="detail-description">${product.description}</p>

                                <div class="detail-features mt-4 mb-4">
                                    <h6 class="fw-bold mb-3"><i class="bi bi-list-check me-2 text-accent"></i>Key Features</h6>
                                    <ul class="list-unstyled">
                                        ${featuresHTML}
                                    </ul>
                                </div>

                                <div class="detail-cta d-flex flex-wrap gap-3">
                                    <a href="${product.affiliateLink}" class="btn btn-amazon btn-lg flex-grow-1" target="_blank" rel="noopener noreferrer">
                                        <i class="bi bi-cart3 me-2"></i>Buy on Amazon
                                    </a>
                                    <a href="product.html" class="btn btn-outline-light btn-lg">
                                        <i class="bi bi-arrow-left me-2"></i>All Products
                                    </a>
                                </div>

                                <div class="detail-trust mt-4">
                                    <div class="d-flex gap-4 flex-wrap">
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="bi bi-shield-check text-success"></i>
                                            <small class="text-muted">Verified Reviews</small>
                                        </div>
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="bi bi-truck text-info"></i>
                                            <small class="text-muted">Free Shipping Eligible</small>
                                        </div>
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="bi bi-arrow-return-left text-warning"></i>
                                            <small class="text-muted">Easy Returns</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;

                // Related products
                const relatedSection = document.getElementById('relatedSection');
                const relatedGrid = document.getElementById('relatedGrid');
                if (relatedSection && relatedGrid) {
                    const related = PRODUCTS.filter(p => p.id !== product.id).slice(0, 3);
                    if (related.length > 0) {
                        relatedGrid.innerHTML = related.map(p => createProductCardHTML(p)).join('');
                        relatedSection.classList.remove('d-none');
                        // Init reveal for related cards
                        setTimeout(() => initRevealCards(), 100);
                    }
                }
            } else {
                // Product not found
                productContent.classList.add('d-none');
                const notFound = document.getElementById('productNotFound');
                if (notFound) notFound.classList.remove('d-none');
            }
        }
    }


    // ==============================================
    //  SHARED FUNCTIONALITY
    // ==============================================

    // ---------- NAVBAR SCROLL EFFECT ----------
    const navbar = document.getElementById('mainNav');
    const backToTopBtn = document.getElementById('backToTop');

    function handleScroll() {
        const scrollY = window.scrollY;

        // Navbar background (only on homepage — product page has it always)
        if (navbar && !navbar.classList.contains('scrolled')) {
            if (scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }

        // Back-to-top button
        if (backToTopBtn) {
            if (scrollY > 400) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        }
    }

    // Only toggle navbar on homepage (product.html has it always scrolled)
    const isHomePage = !document.getElementById('productContent');
    if (isHomePage) {
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    } else {
        // Still need back-to-top on product page
        window.addEventListener('scroll', () => {
            if (backToTopBtn) {
                backToTopBtn.classList.toggle('visible', window.scrollY > 400);
            }
        }, { passive: true });
    }

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }


    // ---------- SCROLL REVEAL FOR PRODUCT CARDS ----------
    function initRevealCards() {
        const revealCards = document.querySelectorAll('.reveal-card:not(.revealed)');
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('revealed');
                    }, index * 100);
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        });
        revealCards.forEach(card => revealObserver.observe(card));
    }

    initRevealCards();


    // ---------- HERO PARTICLES (homepage only) ----------
    const particlesContainer = document.getElementById('heroParticles');
    if (particlesContainer) {
        const count = 25;
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 6 + 's';
            particle.style.animationDuration = (4 + Math.random() * 4) + 's';
            particle.style.width = (2 + Math.random() * 4) + 'px';
            particle.style.height = particle.style.width;
            const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899'];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particlesContainer.appendChild(particle);
        }
    }


    // ---------- NEWSLETTER FORM (homepage only) ----------
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        const newsletterFeedback = document.getElementById('newsletterFeedback');
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('newsletterEmail');
            const email = emailInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                newsletterFeedback.innerHTML = `
                    <div class="alert alert-danger d-inline-flex align-items-center gap-2 py-2 px-3">
                        <i class="bi bi-exclamation-circle-fill"></i> Please enter a valid email address.
                    </div>`;
                return;
            }

            newsletterFeedback.innerHTML = `
                <div class="alert alert-success d-inline-flex align-items-center gap-2 py-2 px-3">
                    <i class="bi bi-check-circle-fill"></i> Thanks for subscribing! Check your inbox.
                </div>`;
            emailInput.value = '';
            setTimeout(() => { newsletterFeedback.innerHTML = ''; }, 5000);
        });
    }


    // ---------- SMOOTH SCROLL FOR NAV LINKS ----------
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return; // skip placeholder links
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
                const navCollapse = document.getElementById('navbarContent');
                if (navCollapse) {
                    const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
                    if (bsCollapse) bsCollapse.hide();
                }
            }
        });
    });


    // ---------- ACTIVE NAV LINK ON SCROLL (homepage only) ----------
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    if (sections.length > 0 && isHomePage) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, {
            threshold: 0.3,
            rootMargin: '-80px 0px 0px 0px'
        });
        sections.forEach(section => sectionObserver.observe(section));
    }

});
