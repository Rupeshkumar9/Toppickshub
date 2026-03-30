
/* ============================================
TopPicksHub — Script
============================================ */
import PRODUCTS from './products.json' with { type: 'json' };

document.addEventListener('DOMContentLoaded', () => {

    // ---------- UTILITY ----------
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

    function getSavePercent(price, originalPrice) {
        return Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    function formatNumber(n) {
        return n.toLocaleString();
    }

    // ---------- PRODUCT CARD HTML ----------
    function createProductCardHTML(product) {
        const badgeHTML = product.badge
            ? `<div class="product-badge ${product.badgeClass || ''}">${product.badge}</div>`
            : '';
        const savePercent = getSavePercent(product.price, product.originalPrice);

        return `
            <div class="reveal-card">
                <a href="product.html?id=${product.id}" class="block no-underline text-inherit hover:text-inherit">
                    <div class="product-card">
                        ${badgeHTML}
                        <div class="relative overflow-hidden aspect-[4/3] bg-[linear-gradient(135deg,rgba(139,92,246,0.05),rgba(59,130,246,0.05))] flex items-center justify-center">
                            <img src="${product.thumbnail_image}" alt="${product.title}" class="product-img" loading="lazy" />
                        </div>
                        <div class="p-5 flex-1 flex flex-col">
                            <div class="text-[0.7rem] font-semibold uppercase tracking-[1.5px] text-accent-purple mb-1">${product.category}</div>
                            <h5 class="product-title">${product.title}</h5>
                            <div class="text-amber-star text-[0.8rem] mb-3">
                                ${getStarsHTML(product.rating)}
                                <span class="ml-1 text-text-secondary text-xs">(${formatNumber(product.reviews)})</span>
                            </div>
                            <div class="flex items-center gap-2 flex-wrap mb-4 mt-auto">
                                <span class="text-xl font-extrabold text-text-primary">$${product.price.toFixed(2)}</span>
                                <span class="text-sm text-text-secondary line-through">$${product.originalPrice.toFixed(2)}</span>
                                <span class="text-[0.7rem] font-bold text-green-save bg-[rgba(34,197,94,0.1)] py-0.5 px-2.5 rounded-full">Save ${savePercent}%</span>
                            </div>
                            <span class="btn-amazon w-full text-center py-2.5">
                                <i class="bi bi-eye-fill mr-2"></i>View Details
                            </span>
                        </div>
                    </div>
                </a>
            </div>`;
    }


    // ==============================================
    //  SEARCH FORM HANDLER
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

    const searchFormMobile = document.getElementById('searchFormMobile');
    const searchInputMobile = document.getElementById('searchInputMobile');

    if (searchFormMobile && searchInputMobile) {
        searchFormMobile.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInputMobile.value.trim();
            if (query.length > 0) {
                window.location.href = `product.html?search=${encodeURIComponent(query)}`;
            }
        });
    }


    // ==============================================
    //  HOME PAGE — Product Grid
    // ==============================================
    const productGrid = document.getElementById('productGrid');

    if (productGrid && typeof PRODUCTS !== 'undefined') {
        const sorted = [...PRODUCTS].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        const latest = sorted.slice(0, 6);
        productGrid.innerHTML = latest.map(p => createProductCardHTML(p)).join('');
        initRevealCards();
    }


    // ================= Date / Hero =====================
    const month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let currentDate = new Date();
    let year = currentDate.getFullYear();
    let month_index = currentDate.getMonth();
    const hero_date = document.getElementById("hero_date");

    if (hero_date) {
        hero_date.textContent = `🔥 Trending Picks - ${month_names[month_index]} ${year}  `;
    }

    document.getElementById("footer_date").textContent = `© ${year} TopPicksHub. All rights reserved.`

    const heroImageEl = document.getElementById("hero_image");
    if (heroImageEl) {
        heroImageEl.innerHTML = `
        <a href="${PRODUCTS[0].affiliateLink}"> <img src="${PRODUCTS[0].thumbnail_image}" alt="Featured Product" class="hero-floating-img max-w-full"/> </a>
        `;
    }

    // ==============================================
    //  PRODUCT DETAIL PAGE
    // ==============================================

    // ---------- Reusable function to render a product's full detail view ----------

    // Helper: detect if a URL is a video
    function isVideoUrl(url) {
        return url.includes('youtube.com/embed/') || url.includes('youtu.be/') ||
            url.includes('youtube.com/watch') || url.includes('amazon.com/vdp/');
    }

    // Helper: convert video URL to embeddable format
    function getVideoEmbedUrl(url) {
        // YouTube embed URL — already embeddable
        if (url.includes('youtube.com/embed/')) return url;
        // YouTube watch URL → embed
        if (url.includes('youtube.com/watch')) {
            const id = new URL(url).searchParams.get('v');
            return id ? `https://www.youtube.com/embed/${id}` : url;
        }
        // YouTube short URL
        if (url.includes('youtu.be/')) {
            const id = url.split('youtu.be/')[1]?.split('?')[0];
            return id ? `https://www.youtube.com/embed/${id}` : url;
        }
        // Amazon video — embed directly
        if (url.includes('amazon.com/vdp/')) return url;
        return url;
    }

    // Helper: render the main media element (image or video iframe)
    function renderMediaElement(url, title, isMain) {
        if (isVideoUrl(url)) {
            const embedUrl = getVideoEmbedUrl(url);
            return `<iframe src="${embedUrl}" title="${title}" class="gallery-video${isMain ? ' detail-img' : ''}" 
                     frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
        }
        return `<img src="${url}" alt="${title}" class="detail-img" id="mainProductImg">`;
    }

    // Helper: render a thumbnail (with play icon overlay for videos)
    function renderThumbHTML(url, title, index, isActive) {
        const isVideo = isVideoUrl(url);
        // For video thumbs, use a generic poster or YouTube thumbnail
        let thumbSrc = url;
        if (url.includes('youtube.com/embed/')) {
            const videoId = url.split('youtube.com/embed/')[1]?.split('?')[0];
            thumbSrc = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
        } else if (url.includes('amazon.com/vdp/')) {
            thumbSrc = ''; // no easy thumbnail for Amazon videos
        }
        return `
            <button class="gallery-thumb ${isActive ? 'active' : ''}" data-media-src="${url}" data-img-index="${index}" data-is-video="${isVideo}">
                ${thumbSrc ? `<img src="${thumbSrc}" alt="${title} - ${index + 1}" />` : `<div class="gallery-thumb-placeholder"><i class="bi bi-camera-video"></i></div>`}
                ${isVideo ? '<div class="gallery-thumb-play"><i class="bi bi-play-fill"></i></div>' : ''}
            </button>`;
    }

    function renderProductDetail(product) {
        const productContent = document.getElementById('productContent');
        if (!productContent) return;

        document.title = `${product.title} — TopPicksHub`;

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', product.description.substring(0, 155) + '...');

        const breadcrumbCategory = document.getElementById('breadcrumbCategory');
        const breadcrumbProduct = document.getElementById('breadcrumbProduct');
        if (breadcrumbCategory) breadcrumbCategory.innerHTML = `<a href="index.html#categories" class="text-accent-purple no-underline hover:text-text-primary transition-all duration-300">${product.category}</a>`;
        if (breadcrumbProduct) breadcrumbProduct.textContent = product.title;

        const savePercent = getSavePercent(product.price, product.originalPrice);
        const saveAmount = (product.originalPrice - product.price).toFixed(2);

        const featuresHTML = product.features.map(f => `
            <li class="flex items-start gap-2 mb-2">
                <i class="bi bi-check-circle-fill text-green-500 mt-1 shrink-0 text-sm"></i>
                <span class="text-text-secondary text-sm leading-relaxed">${f}</span>
            </li>`).join('');

        // Variant selector
        let variantHTML = '';
        if (product.variants && product.variants.length > 1) {
            const pillsHTML = product.variants.map(v => {
                const variantProduct = PRODUCTS.find(p => p.id === v.id);
                const thumb = variantProduct ? variantProduct.thumbnail_image : '';
                const isActive = v.id === product.id ? 'active' : '';
                return `
                    <button class="variant-pill ${isActive}" data-variant-id="${v.id}" title="${v.label}">
                        <img src="${thumb}" alt="${v.label}" class="w-10 h-10 rounded-lg object-contain bg-[rgba(255,255,255,0.06)] p-0.5" />
                        <span class="whitespace-nowrap">${v.label}</span>
                    </button>`;
            }).join('');

            variantHTML = `
                <div class="border border-border-glass rounded-2xl p-4 bg-bg-card mb-4">
                    <h6 class="font-bold mb-3"><i class="bi bi-collection mr-2 text-accent-purple"></i>More Options</h6>
                    <div class="flex flex-wrap gap-3">${pillsHTML}</div>
                </div>`;
        }

        productContent.classList.add('variant-fade-out');
        setTimeout(() => {
            productContent.innerHTML = `
                <div class="flex flex-wrap gap-8 lg:gap-12">
                    <div class="w-full lg:w-[calc(50%-1.5rem)]">
                        <div class="detail-img-wrapper">
                            ${product.badge ? `<div class="product-badge ${product.badgeClass || ''}">${product.badge}</div>` : ''}
                            <div id="galleryMediaContainer">
                                ${(product.Img_Videos && product.Img_Videos.length > 0) ? renderMediaElement(product.Img_Videos[0], product.title, true) : `<img src="${product.thumbnail_image}" alt="${product.title}" class="detail-img" id="mainProductImg">`}
                            </div>
                            ${(product.Img_Videos && product.Img_Videos.length > 1) ? `
                            <button class="gallery-arrow gallery-arrow-left" id="galleryPrev" aria-label="Previous">
                                <i class="bi bi-chevron-left"></i>
                            </button>
                            <button class="gallery-arrow gallery-arrow-right" id="galleryNext" aria-label="Next">
                                <i class="bi bi-chevron-right"></i>
                            </button>
                            <div class="gallery-counter" id="galleryCounter">1 / ${product.Img_Videos.length}</div>
                            ` : ''}
                        </div>
                        ${(product.Img_Videos && product.Img_Videos.length > 1) ? `
                        <div class="gallery-thumbs" id="galleryThumbs">
                            ${product.Img_Videos.map((url, i) => renderThumbHTML(url, product.title, i, i === 0)).join('')}
                        </div>
                        ` : ''}
                    </div>
                    <div class="w-full lg:w-[calc(50%-1.5rem)] flex flex-col">
                        <span class="text-[0.7rem] font-semibold uppercase tracking-[1.5px] text-accent-purple mb-1">${product.category}</span>
                        <h1 class="text-3xl font-extrabold leading-snug tracking-tight mt-2 mb-2">${product.title}</h1>

                        ${variantHTML}

                        <div class="flex items-center gap-2 mb-3">
                            <div class="text-amber-star text-sm">${getStarsHTML(product.rating)}</div>
                            <span class="text-text-secondary">${product.rating} out of 5</span>
                            <span class="text-text-secondary">•</span>
                            <span class="text-text-secondary">${formatNumber(product.reviews)} reviews</span>
                        </div>
                        <div class="bg-bg-card border border-border-glass rounded-2xl p-5 mb-4">
                            <div class="flex items-baseline gap-3 flex-wrap">
                                <span class="text-3xl font-black text-text-primary">$${product.price.toFixed(2)}</span>
                                <span class="text-lg text-text-secondary line-through">$${product.originalPrice.toFixed(2)}</span>
                            </div>
                            <div class="text-sm font-semibold text-green-save mt-1">
                                <i class="bi bi-tag-fill mr-1"></i>You save $${saveAmount} (${savePercent}%)
                            </div>
                        </div>
                        <p class="text-text-secondary text-[0.95rem] leading-relaxed">${product.description}</p>

                        <div class="mt-4 mb-4">
                            <h6 class="font-bold mb-3"><i class="bi bi-list-check mr-2 text-accent-purple"></i>Key Features</h6>
                            <ul class="list-none p-0">${featuresHTML}</ul>
                        </div>

                        <div class="detail-cta flex flex-wrap gap-3">
                            <a href="${product.affiliateLink}" class="btn-amazon py-3 px-6 text-base flex-1" target="_blank" rel="noopener noreferrer">
                                <i class="bi bi-cart3 mr-2"></i>Buy on Amazon
                            </a>
                            <a href="product.html" class="btn-outline-light py-3 px-6">
                                <i class="bi bi-arrow-left mr-2"></i>All Products
                            </a>
                        </div>

                        <div class="border-t border-border-glass pt-4 mt-4">
                            <div class="flex gap-4 flex-wrap">
                                <div class="flex items-center gap-2"><i class="bi bi-shield-check text-green-500"></i><small class="text-text-secondary">Verified Reviews</small></div>
                                <div class="flex items-center gap-2"><i class="bi bi-truck text-cyan-400"></i><small class="text-text-secondary">Free Shipping Eligible</small></div>
                                <div class="flex items-center gap-2"><i class="bi bi-arrow-return-left text-amber-400"></i><small class="text-text-secondary">Easy Returns</small></div>
                            </div>
                        </div>
                    </div>
                </div>`;

            // Variant click handlers
            productContent.querySelectorAll('.variant-pill').forEach(pill => {
                pill.addEventListener('click', (e) => {
                    e.preventDefault();
                    const variantId = pill.getAttribute('data-variant-id');
                    if (variantId === product.id) return;
                    const variantProduct = PRODUCTS.find(p => p.id === variantId);
                    if (variantProduct) {
                        if (!variantProduct.variants && product.variants) variantProduct.variants = product.variants;
                        history.replaceState(null, '', `product.html?id=${variantId}`);
                        renderProductDetail(variantProduct);
                        productContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });

            // Gallery navigation — shared state & functions
            const mediaContainer = document.getElementById('galleryMediaContainer');
            const thumbs = productContent.querySelectorAll('.gallery-thumb');
            const galleryCounter = document.getElementById('galleryCounter');
            const mediaList = product.Img_Videos && product.Img_Videos.length > 1 ? product.Img_Videos : [];
            let currentImgIndex = 0;

            function navigateToImage(index) {
                if (!mediaContainer || mediaList.length === 0) return;
                // Wrap around
                if (index < 0) index = mediaList.length - 1;
                if (index >= mediaList.length) index = 0;
                if (index === currentImgIndex) return;

                currentImgIndex = index;
                const url = mediaList[index];
                // Fade out
                mediaContainer.classList.add('img-fade-out');
                setTimeout(() => {
                    // Swap content — image or video
                    mediaContainer.innerHTML = renderMediaElement(url, product.title, true);
                    mediaContainer.classList.remove('img-fade-out');
                    mediaContainer.classList.add('img-fade-in');
                    setTimeout(() => mediaContainer.classList.remove('img-fade-in'), 300);
                }, 150);
                // Sync thumbnails
                thumbs.forEach(t => t.classList.remove('active'));
                if (thumbs[index]) thumbs[index].classList.add('active');
                // Update counter
                if (galleryCounter) galleryCounter.textContent = `${index + 1} / ${mediaList.length}`;
            }

            // Arrow click handlers
            const prevBtn = document.getElementById('galleryPrev');
            const nextBtn = document.getElementById('galleryNext');
            if (prevBtn) prevBtn.addEventListener('click', () => navigateToImage(currentImgIndex - 1));
            if (nextBtn) nextBtn.addEventListener('click', () => navigateToImage(currentImgIndex + 1));

            // Thumbnail click handlers
            thumbs.forEach(thumb => {
                thumb.addEventListener('click', () => {
                    const idx = parseInt(thumb.getAttribute('data-img-index'));
                    navigateToImage(idx);
                });
            });

            productContent.classList.remove('variant-fade-out');
            productContent.classList.add('variant-fade-in');
            setTimeout(() => productContent.classList.remove('variant-fade-in'), 400);
        }, 150);

        // Related products
        const relatedSection = document.getElementById('relatedSection');
        const relatedGrid = document.getElementById('relatedGrid');
        if (relatedSection && relatedGrid) {
            const variantIds = product.variants ? product.variants.map(v => v.id) : [];
            const related = PRODUCTS.filter(p => p.id !== product.id && !variantIds.includes(p.id)).slice(0, 3);
            if (related.length > 0) {
                relatedGrid.innerHTML = related.map(p => createProductCardHTML(p)).join('');
                relatedSection.classList.remove('hidden');
                setTimeout(() => initRevealCards(), 100);
            } else {
                relatedSection.classList.add('hidden');
            }
        }
    }


    const productContent = document.getElementById('productContent');
    const allProductsListing = document.getElementById('allProductsListing');

    if (productContent && typeof PRODUCTS !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('id');

        if (!productId) {
            // ======= ALL products or SEARCH results =======
            productContent.classList.add('hidden');
            document.getElementById('productBreadcrumb')?.closest('nav')?.classList.add('hidden');

            const searchQuery = params.get('search') ? params.get('search').trim() : '';
            if (searchQuery && searchInput) searchInput.value = searchQuery;

            document.title = searchQuery
                ? `Search: "${searchQuery}" — TopPicksHub`
                : 'All Products — TopPicksHub';

            if (allProductsListing) {
                allProductsListing.classList.remove('hidden');
                const PRODUCTS_PER_PAGE = 10;
                const currentPage = parseInt(params.get('page')) || 1;

                let filteredProducts = [...PRODUCTS].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    filteredProducts = filteredProducts.filter(p =>
                        p.title.toLowerCase().includes(q) ||
                        p.category.toLowerCase().includes(q) ||
                        p.description.toLowerCase().includes(q) ||
                        (p.features && p.features.some(f => f.toLowerCase().includes(q)))
                    );
                }

                // Update header
                const listingBadge = allProductsListing.querySelector('span');
                const listingHeading = allProductsListing.querySelector('h2');
                const listingDesc = allProductsListing.querySelector('p.text-text-secondary');

                if (searchQuery) {
                    if (listingBadge) listingBadge.textContent = 'SEARCH RESULTS';
                    if (listingHeading) listingHeading.textContent = filteredProducts.length > 0
                        ? `${filteredProducts.length} result${filteredProducts.length !== 1 ? 's' : ''} for "${searchQuery}"`
                        : `No results for "${searchQuery}"`;
                    if (listingDesc) listingDesc.textContent = filteredProducts.length > 0
                        ? 'Showing products matching your search.'
                        : 'Try a different keyword or browse all products.';
                }

                const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
                const safePage = Math.max(1, Math.min(currentPage, totalPages || 1));
                const startIdx = (safePage - 1) * PRODUCTS_PER_PAGE;
                const pageProducts = filteredProducts.slice(startIdx, startIdx + PRODUCTS_PER_PAGE);

                const allProductsGrid = document.getElementById('allProductsGrid');
                if (allProductsGrid) {
                    if (pageProducts.length > 0) {
                        allProductsGrid.innerHTML = pageProducts.map(p => createProductCardHTML(p)).join('');
                    } else {
                        allProductsGrid.innerHTML = `
                            <div class="col-span-full text-center py-12">
                                <i class="bi bi-search text-6xl text-text-secondary mb-3 block"></i>
                                <h4 class="text-text-secondary text-xl font-semibold">No products found</h4>
                                <p class="text-text-secondary mb-4">We couldn't find any products matching your search.</p>
                                <a href="product.html" class="btn-glow px-6 py-3"><i class="bi bi-grid-fill mr-2"></i>Browse All Products</a>
                            </div>`;
                    }
                    initRevealCards();
                }

                const paginationBase = searchQuery
                    ? `product.html?search=${encodeURIComponent(searchQuery)}&page=`
                    : `product.html?page=`;

                const paginationEl = document.getElementById('productsPagination');
                if (paginationEl && totalPages > 1) {
                    let paginationHTML = '';
                    paginationHTML += `<li class="page-item ${safePage === 1 ? 'disabled' : ''}"><a class="page-link" href="${paginationBase}${safePage - 1}"><i class="bi bi-chevron-left"></i></a></li>`;
                    for (let i = 1; i <= totalPages; i++) {
                        paginationHTML += `<li class="page-item ${i === safePage ? 'active' : ''}"><a class="page-link" href="${paginationBase}${i}">${i}</a></li>`;
                    }
                    paginationHTML += `<li class="page-item ${safePage === totalPages ? 'disabled' : ''}"><a class="page-link" href="${paginationBase}${safePage + 1}"><i class="bi bi-chevron-right"></i></a></li>`;
                    paginationEl.innerHTML = paginationHTML;
                } else if (paginationEl) {
                    paginationEl.innerHTML = '';
                }
            }

        } else {
            // ======= Single product detail =======
            const product = PRODUCTS.find(p => p.id === productId);
            if (product) {
                renderProductDetail(product);
            } else {
                productContent.classList.add('hidden');
                const notFound = document.getElementById('productNotFound');
                if (notFound) notFound.classList.remove('hidden');
            }
        }
    }


    // ==============================================
    //  SHARED
    // ==============================================

    // Navbar scroll effect
    const navbar = document.getElementById('mainNav');
    const backToTopBtn = document.getElementById('backToTop');
    const isHomePage = !document.getElementById('productContent');

    function handleScroll() {
        const scrollY = window.scrollY;
        if (navbar && !navbar.classList.contains('scrolled')) {
            navbar.classList.toggle('scrolled', scrollY > 50);
        }
        if (backToTopBtn) backToTopBtn.classList.toggle('visible', scrollY > 400);
    }

    if (isHomePage) {
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    } else {
        window.addEventListener('scroll', () => {
            if (backToTopBtn) backToTopBtn.classList.toggle('visible', window.scrollY > 400);
        }, { passive: true });
    }

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }


    // Scroll reveal
    function initRevealCards() {
        const cards = document.querySelectorAll('.reveal-card:not(.revealed)');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => entry.target.classList.add('revealed'), index * 100);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
        cards.forEach(card => observer.observe(card));
    }
    initRevealCards();


    // Hero particles
    const particlesContainer = document.getElementById('heroParticles');
    if (particlesContainer) {
        const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899'];
        for (let i = 0; i < 25; i++) {
            const p = document.createElement('div');
            p.classList.add('particle');
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 6 + 's';
            p.style.animationDuration = (4 + Math.random() * 4) + 's';
            const size = (2 + Math.random() * 4) + 'px';
            p.style.width = size;
            p.style.height = size;
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            particlesContainer.appendChild(p);
        }
    }


    // Newsletter form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        const feedback = document.getElementById('newsletterFeedback');
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('newsletterEmail');
            const email = emailInput.value.trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                feedback.innerHTML = `<div class="rounded-xl text-sm max-w-[400px] mx-auto py-2 px-3 inline-flex items-center gap-2 bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] text-[#fca5a5]"><i class="bi bi-exclamation-circle-fill"></i> Please enter a valid email address.</div>`;
                return;
            }
            feedback.innerHTML = `<div class="rounded-xl text-sm max-w-[400px] mx-auto py-2 px-3 inline-flex items-center gap-2 bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.3)] text-[#86efac]"><i class="bi bi-check-circle-fill"></i> Thanks for subscribing! Check your inbox.</div>`;
            emailInput.value = '';
            setTimeout(() => { feedback.innerHTML = ''; }, 5000);
        });
    }


    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#' || this.hasAttribute('data-modal-target')) return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
                const mobileMenu = document.getElementById('mobileMenu');
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                    mobileMenu.classList.remove('flex');
                }
            }
        });
    });


    // Active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    if (sections.length > 0 && isHomePage) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) link.classList.add('active');
                    });
                }
            });
        }, { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' });
        sections.forEach(section => observer.observe(section));
    }


    // ==============================================
    //  MOBILE NAV TOGGLE
    // ==============================================
    const navToggle = document.getElementById('navToggle');
    const mobileMenu = document.getElementById('mobileMenu');

    if (navToggle && mobileMenu) {
        navToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            mobileMenu.classList.toggle('flex');
        });
    }


    // ==============================================
    //  MODAL HANDLERS
    // ==============================================
    document.querySelectorAll('[data-modal-target]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById(trigger.getAttribute('data-modal-target'));
            if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
        });
    });

    document.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const active = document.querySelector('.modal-overlay.active');
            if (active) { active.classList.remove('active'); document.body.style.overflow = ''; }
        }
    });


    // ==============================================
    //  ACCORDION HANDLERS
    // ==============================================
    document.querySelectorAll('[data-accordion-target]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.getAttribute('data-accordion-target'));
            const accordion = btn.closest('[data-accordion]');
            if (!target) return;

            if (target.classList.contains('show')) {
                target.classList.remove('show');
                btn.classList.remove('active');
                return;
            }

            if (accordion) {
                accordion.querySelectorAll('.accordion-collapse.show').forEach(el => el.classList.remove('show'));
                accordion.querySelectorAll('.accordion-button.active').forEach(el => el.classList.remove('active'));
            }

            target.classList.add('show');
            btn.classList.add('active');
        });
    });

});
