let vinylData = null;

async function loadData() {
    if (vinylData) return vinylData;
    try {
        const response = await fetch('data/vinilos.json');
        vinylData = await response.json();
        return vinylData;
    } catch (error) {
        console.error('Error loading data:', error);
        return null;
    }
}

function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return value.toFixed(2) + '€';
}

function getImageSrc(portada) {
    if (!portada || portada === 'NaN') return null;
    const normalized = String(portada).trim();
    if (!normalized) return null;
    return `images/${normalized}`;
}

function normalizeForMatch(str) {
    if (!str) return '';
    return String(str).toLowerCase()
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/[_\-.]/g, ' ')
        .replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractKeyWords(str) {
    if (!str) return [];
    const norm = normalizeForMatch(str);
    const stopWords = ['the', 'album', 'del', 'de', 'la', 'el', 'los', 'las', 'en', 'y', 'a', 'with', 'from'];
    const words = norm.split(' ').filter(w => w.length > 2 && !stopWords.includes(w));
    return words;
}

let imageCache = null;

async function getAvailableImages() {
    if (imageCache) return imageCache;
    try {
        const response = await fetch('data/images.json');
        imageCache = await response.json();
        return imageCache;
    } catch {
        imageCache = [];
        return imageCache;
    }
}

function findMatchingImage(titulo, artista) {
    if (!imageCache || imageCache.length === 0) return null;
    
    const titleNorm = normalizeForMatch(titulo);
    const artistNorm = normalizeForMatch(artista);
    const titleWords = extractKeyWords(titulo);
    const artistWords = extractKeyWords(artista);
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const img of imageCache) {
        const imgNorm = normalizeForMatch(img);
        const imgWords = extractKeyWords(img);
        
        let score = 0;
        
        // Exact match (title or artist in image name)
        if (titleNorm && (imgNorm.includes(titleNorm) || titleNorm.includes(imgNorm))) {
            score += 150;
        }
        if (artistNorm && (imgNorm.includes(artistNorm) || artistNorm.includes(artistNorm))) {
            score += 100;
        }
        
        // Word-based matching - check if significant words from title appear in image
        let titleWordMatches = 0;
        for (const tw of titleWords) {
            if (tw.length > 3 && imgNorm.includes(tw)) {
                score += 25;
                titleWordMatches++;
            }
        }
        
        // Artist word matching
        for (const aw of artistWords) {
            if (aw.length > 3 && imgNorm.includes(aw)) {
                score += 20;
            }
        }
        
        // Word overlap - count matching words
        const commonTitleWords = titleWords.filter(w => imgWords.includes(w));
        const commonArtistWords = artistWords.filter(w => imgWords.includes(w));
        score += commonTitleWords.length * 30;
        score += commonArtistWords.length * 25;
        
        // Partial title match bonus (at least 50% of significant words match)
        if (titleWordMatches > 0 && titleWords.length > 0) {
            const matchRatio = titleWordMatches / titleWords.length;
            if (matchRatio >= 0.5) {
                score += 50;
            }
        }
        
if (score > bestScore) {
            bestScore = score;
            bestMatch = img;
        }
    }
    
    // Lower threshold for matching
    return bestScore >= 10 ? `images/${bestMatch}` : null;
}

// Manual mapping for specific vinyls with known image names
const manualImageMap = {
    4: 'simonygarfubkle.jpg',              // Simon & Garfunkel Collection
    33: 'lomejordecream.jpg',              // Lo Mejor de Cream
    47: 'birt of the coool.jpg',           // Birth of the Cool
    62: 'ledZeppellin II.jpg',             // Led Zeppelin II
    64: 'queenisdead.jpg',                // Queen is Dead
    65: 'LedZepplein IV.jpg',             // Led Zeppelin IV
    88: 'freewhelin bob dyla.jpg',        // Freewheelin' Bob Dylan
    92: 'songfoLeonardCohen.jpg',         // Songs of Leonard Cohen
    95: 'construcao-limitededition-burque.jpg', // Construçao
    101: 'chicho sanchez ferlosio.jpg',   // Resistencia Española
    115: 'TheBeatles68LP.jpg',            // White Album
    117: 'Palmera_Palmera.jpeg',           // Palmera
    118: 'Songs_of_love_and_hate_Leonard_Cohen.jpg', // Songs of Love and Hate
    119: 'TeaForTheTellerman_CatStevens.jpg', // Tea for the Tillerman
    120: 'TheLasatWaltz_TheBand.jpg',      // The Last Waltz
};

function getManualImage(numero) {
    return manualImageMap[numero] ? `images/${manualImageMap[numero]}` : null;
}

async function createVinylCard(vinyl) {
    let imageSrc = getManualImage(vinyl.numero);
    if (!imageSrc) {
        imageSrc = getImageSrc(vinyl.portada);
    }
    if (!imageSrc) {
        await getAvailableImages();
        imageSrc = findMatchingImage(vinyl.titulo, vinyl.artista);
    }
    const card = document.createElement('div');
    card.className = 'vinyl-card';
    card.onclick = () => window.location.href = `disco.html?id=${vinyl.numero}`;
    
    let imageHtml;
    if (imageSrc) {
        imageHtml = `<img src="${imageSrc}" alt="${vinyl.titulo}" onerror="this.onerror=null; this.src=''; this.outerHTML='<div class=\\'no-image\\'>♪</div>'">`;
    } else {
        imageHtml = '<div class="no-image">♪</div>';
    }
    
    card.innerHTML = `
        ${imageHtml}
        <div class="vinyl-card-info">
            <h3>${vinyl.titulo || 'Sin título'}</h3>
            <p>${vinyl.artista || 'Artista desconocido'}</p>
        </div>
    `;
    return card;
}

async function createSearchResultItem(vinyl) {
    let imageSrc = getImageSrc(vinyl.portada);
    if (!imageSrc) {
        await getAvailableImages();
        imageSrc = findMatchingImage(vinyl.titulo, vinyl.artista);
    }
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.onclick = () => window.location.href = `disco.html?id=${vinyl.numero}`;
    
    let imageHtml;
    if (imageSrc) {
        imageHtml = `<img src="${imageSrc}" alt="${vinyl.titulo}" onerror="this.style.display='none'">`;
    } else {
        imageHtml = '<div style="width:60px;height:60px;background:var(--cream-dark);display:flex;align-items:center;justify-content:center;border-radius:5px;font-size:1.5rem;color:var(--text-light)">♪</div>';
    }
    
    item.innerHTML = `
        ${imageHtml}
        <div class="search-result-info">
            <h4>${vinyl.titulo || 'Sin título'}</h4>
            <p>${vinyl.artista || 'Artista desconocido'}</p>
        </div>
    `;
    return item;
}

// Home Page Functions
async function initHome() {
    const data = await loadData();
    if (!data) return;
    
    // Update stats
    document.getElementById('total-discos').textContent = data.total_discos;
    document.getElementById('total-pagado').textContent = formatCurrency(data.total_pagado);
    
    // Calculate total current value from vinyls
    let totalValor = 0;
    data.vinyls.forEach(v => {
        if (v.precio_actual) totalValor += v.precio_actual;
    });
    document.getElementById('total-valor').textContent = formatCurrency(totalValor);
    
    // Difference
    const diferencia = totalValor - data.total_pagado;
    const diffEl = document.getElementById('total-diferencia');
    diffEl.textContent = (diferencia >= 0 ? '+' : '') + formatCurrency(diferencia);
    diffEl.style.color = diferencia >= 0 ? '#2e7d32' : '#c62828';
    
    // Preview grid (first 8 vinyls)
    const previewGrid = document.getElementById('preview-grid');
    for (const vinyl of data.vinyls.slice(-10)) {
        previewGrid.appendChild(await createVinylCard(vinyl));
    }
    
    // Search functionality
    const searchInput = document.getElementById('busqueda');
    const resultsContainer = document.getElementById('resultados-busqueda');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        resultsContainer.innerHTML = '';
        
        if (query.length < 2) return;
        
        const matches = data.vinyls.filter(v => 
            (v.titulo && v.titulo.toLowerCase().includes(query)) ||
            (v.artista && v.artista.toLowerCase().includes(query))
        ).slice(0, 10);
        
        matches.forEach(async (vinyl) => {
            resultsContainer.appendChild(await createSearchResultItem(vinyl));
        });
        
        if (matches.length === 0) {
            resultsContainer.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:20px">No se encontraron resultados</p>';
        }
    });
}

// Collection Page Functions
async function initCollection() {
    const data = await loadData();
    if (!data) return;
    
    const grid = document.getElementById('coleccion-grid');
    const countEl = document.getElementById('collection-count');
    countEl.textContent = `${data.vinyls.length} discos`;
    
    // Populate genre filter
    const generoSelect = document.getElementById('filtro-genero');
    const generos = [...new Set(data.vinyls.map(v => v.genero).filter(g => g))].sort();
    generos.forEach(g => {
        const option = document.createElement('option');
        option.value = g;
        option.textContent = g;
        generoSelect.appendChild(option);
    });
    
    // Populate year filter
    const anoSelect = document.getElementById('filtro-ano');
    const anos = [...new Set(data.vinyls.map(v => v.ano).filter(a => a))].sort((a, b) => b - a);
    anos.forEach(a => {
        const option = document.createElement('option');
        option.value = a;
        option.textContent = a;
        anoSelect.appendChild(option);
    });
    
    // Render all vinyls initially
    renderCollection(data.vinyls);
    
    // Search functionality
    const searchInput = document.getElementById('busqueda-coleccion');
    const generoFilter = document.getElementById('filtro-genero');
    const anoFilter = document.getElementById('filtro-ano');
    const precioFilter = document.getElementById('filtro-precio');
    
    function filterVinyls() {
        const query = searchInput.value.toLowerCase();
        const genero = generoFilter.value;
        const ano = anoFilter.value;
        const precio = precioFilter.value;
        
        let filtered = data.vinyls;
        
        if (query) {
            filtered = filtered.filter(v => 
                (v.titulo && v.titulo.toLowerCase().includes(query)) ||
                (v.artista && v.artista.toLowerCase().includes(query))
            );
        }
        
        if (genero) {
            filtered = filtered.filter(v => v.genero === genero);
        }
        
        if (ano) {
            filtered = filtered.filter(v => v.ano == ano);
        }
        
        if (precio) {
            if (precio === '50+') {
                filtered = filtered.filter(v => v.precio_compra != null && Number(v.precio_compra) >= 50);
            } else if (precio.includes('-')) {
                const [min, max] = precio.split('-').map(Number);
                filtered = filtered.filter(v => 
                    v.precio_compra != null && 
                    Number(v.precio_compra) >= min && 
                    Number(v.precio_compra) < max
                );
            }
        }
        
        renderCollection(filtered);
    }
    
    searchInput.addEventListener('input', filterVinyls);
    generoFilter.addEventListener('change', filterVinyls);
    anoFilter.addEventListener('change', filterVinyls);
    precioFilter.addEventListener('change', filterVinyls);
}

async function renderCollection(vinyls) {
    const grid = document.getElementById('coleccion-grid');
    grid.innerHTML = '';
    
    if (vinyls.length === 0) {
        grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-light);padding:40px">No se encontraron vinilos</p>';
        return;
    }
    
    for (const vinyl of vinyls) {
        grid.appendChild(await createVinylCard(vinyl));
    }
}

// Disco Detail Page Functions
async function initDisco() {
    const data = await loadData();
    if (!data) return;
    
    // Get ID from URL
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));
    
    const vinyl = data.vinyls.find(v => v.numero === id);
    if (!vinyl) {
        document.querySelector('.disco-detail').innerHTML = '<p style="text-align:center;padding:40px">Disco no encontrado</p>';
        return;
    }
    
    // Set basic info
    document.getElementById('disco-titulo').textContent = vinyl.titulo || 'Sin título';
    document.getElementById('disco-artista').textContent = vinyl.artista || 'Artista desconocido';
    
    // Portada
    let imageSrc = getManualImage(vinyl.numero);
    if (!imageSrc) {
        imageSrc = getImageSrc(vinyl.portada);
    }
    if (!imageSrc) {
        await getAvailableImages();
        imageSrc = findMatchingImage(vinyl.titulo, vinyl.artista);
    }
    const imgEl = document.getElementById('disco-portada-img');
    if (imageSrc) {
        imgEl.src = imageSrc;
        imgEl.onerror = () => { imgEl.src = ''; imgEl.alt = 'Imagen no disponible'; };
    } else {
        imgEl.style.display = 'none';
    }
    
    // Meta info
    document.getElementById('disco-ano').textContent = vinyl.ano || '-';
    document.getElementById('disco-genero').textContent = vinyl.genero || '-';
    document.getElementById('disco-tipo').textContent = vinyl.tipo_edicion || '-';
    
    // Prices
    document.getElementById('disco-precio-compra').textContent = formatCurrency(vinyl.precio_compra);
    document.getElementById('disco-precio-actual').textContent = formatCurrency(vinyl.precio_actual);
    
    const diffEl = document.getElementById('disco-diferencia');
    if (vinyl.diferencia !== null && vinyl.diferencia !== undefined) {
        diffEl.textContent = (vinyl.diferencia >= 0 ? '+' : '') + formatCurrency(vinyl.diferencia);
        diffEl.style.color = vinyl.diferencia >= 0 ? '#2e7d32' : '#c62828';
    } else {
        diffEl.textContent = '-';
    }
    
    // Purchase info
    document.getElementById('disco-fecha').textContent = vinyl.fecha || '-';
    document.getElementById('disco-lugar').textContent = vinyl.lugar_compra || '-';
    
    // Search Discogs for this release
    searchDiscogs(vinyl.titulo, vinyl.artista);
    
    // Tracklist (for now, hide - can be added manually)
    document.getElementById('tracklist-section').style.display = 'none';
}

async function searchDiscogs(titulo, artista) {
    const discogsLink = document.getElementById('disco-discogs');
    if (!discogsLink) return;
    
    // Use direct search URL (more reliable than API)
    const searchQuery = encodeURIComponent(`${titulo} ${artista}`.trim());
    const searchUrl = `https://www.discogs.com/es/search/?q=${searchQuery}&type=release`;
    
    discogsLink.href = searchUrl;
    discogsLink.textContent = 'Buscar en Discogs';
    discogsLink.target = '_blank';
}

// Make functions available globally
window.initHome = initHome;
window.initCollection = initCollection;
window.initDisco = initDisco;
window.changeVinylColor = changeVinylColor;

// Vinyl color change functionality
const vinylColors = [
    { name: 'cream', gradient: 'radial-gradient(circle at 30% 30%, #555 0%, #222 50%, #000 100%)' },
    { name: 'red', gradient: 'radial-gradient(circle at 30% 30%, #ff6b6b 0%, #c92a2a 50%, #8b0000 100%)' },
    { name: 'yellow', gradient: 'radial-gradient(circle at 30% 30%, #ffd43b 0%, #f59f00 50%, #cc8500 100%)' },
    { name: 'blue', gradient: 'radial-gradient(circle at 30% 30%, #74c0fc 0%, #1971c2 50%, #004080 100%)' },
    { name: 'white', gradient: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #dee2e6 50%, #adb5bd 100%)' },
    { name: 'purple', gradient: 'radial-gradient(circle at 30% 30%, #da77f2 0%, #9c36b5 50%, #6b2078 100%)' }
];
let currentColorIndex = 0;

function changeVinylColor() {
    currentColorIndex = (currentColorIndex + 1) % vinylColors.length;
    const vinylRecord = document.getElementById('vinyl-record');
    if (vinylRecord) {
        vinylRecord.style.background = vinylColors[currentColorIndex].gradient;
    }
}