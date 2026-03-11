// ============================================
// SEVEN CITIES - Main Application
// ============================================

class SevenCitiesApp {
  constructor() {
    this.currentLang = this.getLanguageFromURL() || 'ro';
    this.currentCity = this.getCityFromURL() || null;
    this.citiesData = null;
    this.adventureData = null;
    this.translations = {};
    this.adventureState = {};
    this.map = null;
    this.mapMarkers = null;
    this.mapMarkerBounds = null;
    this.handleResize = this.handleResize.bind(this);
    
    this.init();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async init() {
    try {
      window.addEventListener('resize', this.handleResize);

      // Load cities and translations data
      await this.loadCitiesData();
      await this.loadAdventureData();
      
      // Set up language buttons
      this.setupLanguageButtons();
      
      // Determine if we're on index or city page
      const isIndexPage = window.location.pathname.endsWith('index.html') || 
                          window.location.pathname === '/' ||
                          window.location.pathname.endsWith('/');
      
      if (isIndexPage) {
        this.renderIndexPage();
      } else if (this.currentCity) {
        await this.renderCityPage();
      }
      
      // Apply initial language
      this.applyLanguage(this.currentLang);
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  }

  handleResize() {
    if (!this.map || this.currentCity) return;

    this.map.invalidateSize();
    this.updateIndexMapViewport();
  }

  isMobileViewport() {
    return window.innerWidth <= 768;
  }

  // ============================================
  // DATA LOADING
  // ============================================

  async loadCitiesData() {
    const response = await fetch('data/cities.json');
    const data = await response.json();
    this.citiesData = data;
    this.translations = data.translations;
  }

  async loadAdventureData() {
    const response = await fetch('data/adventure-game.json');
    const data = await response.json();
    this.adventureData = data;
  }

  // ============================================
  // URL PARAMETER HANDLING
  // ============================================

  getLanguageFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('lang');
  }

  getCityFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('city');
  }

  updateURL(city = null, lang = null) {
    const language = lang || this.currentLang;
    
    if (city) {
      const url = `city.html?city=${city}&lang=${language}`;
      window.history.pushState({ city, lang: language }, '', url);
    } else {
      const url = `?lang=${language}`;
      window.history.pushState({ lang: language }, '', url);
    }
  }

  // ============================================
  // LANGUAGE MANAGEMENT
  // ============================================

  setupLanguageButtons() {
    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lang = e.target.getAttribute('data-lang');
        this.switchLanguage(lang);
      });
    });
  }

  switchLanguage(lang) {
    this.currentLang = lang;
    this.updateURL(this.currentCity, lang);
    this.applyLanguage(lang);
  }

  applyLanguage(lang) {
    // Update lang buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.getTranslation(key, lang);
      if (translation) {
        element.textContent = translation;
      }
    });

    // If on city page, re-render content
    if (this.currentCity) {
      this.renderCityPageContent();
    } else {
      this.renderIndexPage();
    }
  }

  getTranslation(key, lang) {
    const languageTranslations = this.translations?.[lang] || {};

    if (languageTranslations[key]) {
      return languageTranslations[key];
    }

    const keys = key.split('.');
    let value = languageTranslations;

    for (let k of keys) {
      value = value?.[k];
    }

    return value || key;
  }

  // ============================================
  // INDEX PAGE RENDERING
  // ============================================

  renderIndexPage() {
    const mapElement = document.getElementById('cities-map');
    const mobileList = document.getElementById('mobile-city-list');
    
    if (!mapElement || !this.citiesData) return;
    if (!window.L) {
      console.error('Leaflet is not loaded.');
      return;
    }

    document.body.classList.forEach(cls => {
      if (cls.startsWith('city-')) {
        document.body.classList.remove(cls);
      }
    });

    if (!this.map) {
      const isMobile = this.isMobileViewport();

      this.map = L.map('cities-map', {
        zoomControl: false,
        attributionControl: true,
        dragging: isMobile,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: isMobile,
        tap: isMobile
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 10,
        minZoom: 5,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

    } else {
      const isMobile = this.isMobileViewport();
      this.map.dragging[isMobile ? 'enable' : 'disable']();
      if (isMobile) {
        this.map.touchZoom.enable();
        this.map.tap?.enable?.();
      } else {
        this.map.touchZoom.disable();
        this.map.tap?.disable?.();
      }
      this.map.invalidateSize();
    }

    if (!this.mapMarkers) {
      this.mapMarkers = L.layerGroup().addTo(this.map);
    } else {
      this.mapMarkers.clearLayers();
    }

    const cities = this.citiesData.cities;
    const coordinates = {
      efes: [37.949, 27.341],
      smirna: [38.423, 27.142],
      pergam: [39.120, 27.180],
      tiatira: [38.918, 27.841],
      sardis: [38.485, 28.037],
      filatelia: [38.350, 28.517],
      laodicea: [37.834, 29.116]
    };

    const markerBounds = [];

    cities.forEach((city, index) => {
      const coords = coordinates[city.id];
      if (!coords) return;

      markerBounds.push(coords);

      const marker = L.circleMarker(coords, {
        radius: this.isMobileViewport() ? 8 : 11,
        color: '#e94560',
        weight: 2,
        fillColor: '#f1a208',
        fillOpacity: 0.9
      }).addTo(this.mapMarkers);

      marker.bindTooltip(`${index + 1}. ${city.name[this.currentLang]}`, {
        direction: 'top',
        offset: [0, -8],
        opacity: 0.95
      });

      marker.on('click', () => this.goToCity(city.id));
    });

    if (mobileList) {
      mobileList.innerHTML = cities.map((city, index) => `
        <button class="mobile-city-item" onclick="app.goToCity('${city.id}')">
          <span class="mobile-city-index">${index + 1}</span>
          <span class="mobile-city-name">${city.name[this.currentLang]}</span>
        </button>
      `).join('');
    }

    this.mapMarkerBounds = L.latLngBounds(markerBounds);
    this.updateIndexMapViewport();
  }

  updateIndexMapViewport() {
    if (!this.map || !this.mapMarkerBounds) return;

    const isMobile = this.isMobileViewport();
    const padding = isMobile ? [22, 22] : [60, 60];

    this.map.fitBounds(this.mapMarkerBounds, { padding });

    const lockedZoom = isMobile ? Math.max(this.map.getZoom() - 0.35, 0) : this.map.getZoom();
    this.map.setZoom(lockedZoom);
    this.map.setMinZoom(lockedZoom);
    this.map.setMaxZoom(lockedZoom + (isMobile ? 1 : 0));
  }

  goToCity(cityId) {
    this.currentCity = cityId;
    this.updateURL(cityId, this.currentLang);
    window.location.href = `city.html?city=${cityId}&lang=${this.currentLang}`;
  }

  // ============================================
  // CITY PAGE RENDERING
  // ============================================

  async renderCityPage() {
    // Get city data
    const city = this.citiesData.cities.find(c => c.id === this.currentCity);
    
    if (!city) {
      console.error('City not found:', this.currentCity);
      return;
    }

    document.body.classList.forEach(cls => {
      if (cls.startsWith('city-')) {
        document.body.classList.remove(cls);
      }
    });
    document.body.classList.add(`city-${city.id}`);

    const cityThemeLink = document.getElementById('city-theme');
    if (cityThemeLink) {
      cityThemeLink.href = `assets/css/city-${city.id}.css`;
    }

    // Set page title
    document.title = `${city.name[this.currentLang]} - 7 Cetăți`;

    // Render city header
    this.renderCityHeader(city);

    // Render video
    this.renderVideo(city);

    // Render main content from Markdown
    await this.renderMainContent(city);

    // Render sidebar
    this.renderSidebar(city);

    // Render adventure game
    this.renderAdventureGame(city);
  }

  renderCityPageContent() {
    const city = this.citiesData.cities.find(c => c.id === this.currentCity);
    
    if (!city) return;

    // Update header
    this.renderCityHeader(city);
    
    // Update main content
    this.renderMainContent(city);
    
    // Update sidebar
    this.renderSidebar(city);
    
    // Update adventure game
    this.renderAdventureGame(city);
  }

  renderCityHeader(city) {
    const titleEl = document.getElementById('city-title');
    const regionEl = document.getElementById('city-region');
    const eraEl = document.getElementById('city-era');

    if (titleEl) titleEl.textContent = city.name[this.currentLang];
    if (regionEl) regionEl.textContent = city.region[this.currentLang];
    if (eraEl) eraEl.textContent = city.era[this.currentLang];
  }

  renderVideo(city) {
    const videoContainer = document.getElementById('city-video');
    if (videoContainer) {
      videoContainer.src = `https://www.youtube.com/embed/${city.videoId}`;
    }
  }

  async renderMainContent(city) {
    const contentEl = document.getElementById('city-content');
    
    if (!contentEl) return;

    try {
      // Fetch markdown file
      const mdPath = `content/${this.currentLang}/${city.id}.md`;
      const response = await fetch(mdPath);
      
      if (!response.ok) {
        contentEl.innerHTML = `<p>Content not available in ${this.currentLang}.</p>`;
        return;
      }

      const markdown = await response.text();
      
      // Render markdown to HTML using marked
      const html = marked.parse(markdown);
      contentEl.innerHTML = html;
    } catch (error) {
      console.error('Error loading markdown:', error);
      contentEl.innerHTML = '<p>Error loading content.</p>';
    }
  }

  renderSidebar(city) {
    const highlightsEl = document.getElementById('city-highlights');
    const reasonsEl = document.getElementById('city-reasons');

    if (highlightsEl) {
      highlightsEl.innerHTML = city.highlights[this.currentLang]
        .map(h => `<li>${h}</li>`)
        .join('');
    }

    if (reasonsEl) {
      reasonsEl.innerHTML = city.reasons[this.currentLang]
        .map(r => `<li>${r}</li>`)
        .join('');
    }
  }

  // ============================================
  // ADVENTURE GAME
  // ============================================

  renderAdventureGame(city) {
    const adventureData = this.adventureData.adventure[this.currentCity];
    
    if (!adventureData) {
      console.warn(`No adventure data for city: ${this.currentCity}`);
      return;
    }

    // Initialize adventure state
    this.adventureState = {
      city: this.currentCity,
      currentNode: 'start',
      lang: this.currentLang
    };

    this.displayAdventureNode('start', adventureData);
  }

  displayAdventureNode(nodeId, adventureData) {
    const textEl = document.getElementById('adventure-text');
    const choicesEl = document.getElementById('adventure-choices');
    const resultEl = document.getElementById('adventure-result');

    const node = adventureData[nodeId];
    
    if (!node) {
      console.error('Node not found:', nodeId);
      return;
    }

    // Display text
    if (textEl) {
      textEl.textContent = node.text;
    }

    // Clear result
    if (resultEl) {
      resultEl.style.display = 'none';
      resultEl.innerHTML = '';
    }

    // Display choices or result
    if (choicesEl) {
      if (node.choices && node.choices.length > 0) {
        choicesEl.innerHTML = node.choices
          .map(choice => `
            <button class="choice-btn" onclick="app.chooseAdventure('${choice.next}')">
              ${choice.text}
            </button>
          `)
          .join('');
      } else if (node.result) {
        choicesEl.innerHTML = '';
        if (resultEl) {
          resultEl.innerHTML = `<p>${node.result}</p>`;
          resultEl.style.display = 'block';
        }
      }
    }

    this.adventureState.currentNode = nodeId;
  }

  chooseAdventure(nextNodeId) {
    const adventureData = this.adventureData.adventure[this.currentCity];
    this.displayAdventureNode(nextNodeId, adventureData);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getCurrentCity() {
    return this.citiesData.cities.find(c => c.id === this.currentCity);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SevenCitiesApp();
});
