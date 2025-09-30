class PageVisitsTracker {
  constructor() {
      this.currentTab = null;
      this.startTime = null;
      this.keywordToCategoryMap = {};
      this.categoryTags = {};
      this.isTracking = false;
      this.init();
  }

  init() {
      this.loadKeywordToCategoryMap();
      this.loadCategoryTags();
      this.setupListeners();
      this.startTrackingActiveTab();
  }

  setupListeners() {
      chrome.tabs.onActivated.addListener(this.handleTabActivated.bind(this));
      chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
      chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
      chrome.windows.onFocusChanged.addListener(this.handleWindowFocusChanged.bind(this));
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
      chrome.storage.onChanged.addListener(this.handleStorageChange.bind(this));
  }

  loadKeywordToCategoryMap() {
      chrome.storage.local.get('keywordToCategoryMap', (data) => {
          this.keywordToCategoryMap = data.keywordToCategoryMap || {};
      });
  }

  loadCategoryTags() {
    chrome.storage.sync.get('categoryTags', (data) => {
        if (!data.categoryTags || Object.keys(data.categoryTags).length === 0) {
            this.categoryTags = {
              social: ['facebook', 'instagram', 'youtube'],
              education: ['wikipedia', 'udemy'],
              work: ['office'],
              research: ['chatgpt', 'scholar'],
              other: []
            };
            chrome.storage.sync.set({ categoryTags: this.categoryTags });
        } else {
            this.categoryTags = data.categoryTags;
        }
        this.updateKeywordToCategoryMap();

        chrome.storage.local.get('pageVisits', (result) => {
            if (!result.pageVisits || result.pageVisits.length === 0) {
                this.resetData();
            }
        });
    });
}

  resetData() {
      // Necháme výchozí keywords
      this.categoryTags = {
          social: ['facebook', 'instagram', 'youtube'],
          education: ['wikipedia', 'udemy'],
          work: ['office'],
          research: ['chatgpt', 'scholar'],
          other: []
      };
      chrome.storage.sync.set({ categoryTags: this.categoryTags });
      this.keywordToCategoryMap = {};
      chrome.storage.local.set({ pageVisits: [] });
      this.updateKeywordToCategoryMap();
  }

  updateKeywordToCategoryMap() {
      if (this.categoryTags && typeof this.categoryTags === 'object') {
          Object.entries(this.categoryTags).forEach(([category, keywords]) => {
              this.keywordToCategoryMap[category] = keywords;
          });
          chrome.storage.local.set({ keywordToCategoryMap: this.keywordToCategoryMap });
      } else {
          console.warn('categoryTags is null or undefined, skipping updateKeywordToCategoryMap');
      }
  }

  handleMessage(message, sender, sendResponse) {
      if (message.action === 'trackPageVisits') {
          this.startTrackingActiveTab();
          sendResponse({ success: true });
      } else if (message.action === 'getPageVisits') {
          this.getPageVisits(sendResponse);
      } else if (message.action === 'clearData') {
          this.clearData();
          sendResponse({ success: true });
      } else if (message.action === 'clearPageVisits') {
          this.clearPageVisits(sendResponse);
      }
      return true;
  }

  handleTabActivated(activeInfo) {
      this.saveCurrentVisit();
      this.startTracking(activeInfo.tabId);
  }

  handleTabUpdated(tabId, changeInfo, tab) {
      if (tab.active && changeInfo.url) {
          this.saveCurrentVisit();
          this.startTracking(tabId);
      }
  }

  handleTabRemoved(tabId, removeInfo) {
      if (tabId === this.currentTab?.id) {
          this.saveCurrentVisit();
          this.stopTracking();
      }
  }

  startTracking(tabId) {
      chrome.tabs.get(tabId, (tab) => {
          if (tab && this.isValidUrl(tab.url)) {
              this.currentTab = tab;
              this.startTime = Date.now();
              this.isTracking = true;
          } else {
              this.stopTracking();
          }
      });
  }

  stopTracking() {
      this.currentTab = null;
      this.startTime = null;
      this.isTracking = false;
  }

  saveCurrentVisit() {
      if (!this.isTracking || !this.currentTab || !this.startTime) {
          return;
      }

      const timeSpent = Date.now() - this.startTime;
      if (timeSpent > 500) {
          this.savePageVisit(this.currentTab.url, this.currentTab.title, timeSpent);
      }
  }

  handleWindowFocusChanged(windowId) {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
          this.saveCurrentVisit();
          this.stopTracking();
      } else {
          chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
              if (tabs.length > 0) {
                  this.saveCurrentVisit();
                  this.startTracking(tabs[0].id);
              }
          });
      }
  }


  isValidUrl(url) {
      const invalidProtocols = ['chrome:', 'chrome-extension:', 'about:', 'data:', 'file:', 'moz-extension:'];
      const invalidPages = ['chrome://newtab/', 'about:blank'];
      
      if (!url || typeof url !== 'string') {
          return false;
      }
      
      const lowerUrl = url.toLowerCase();
      const hasInvalidProtocol = invalidProtocols.some(protocol => lowerUrl.startsWith(protocol));
      const isInvalidPage = invalidPages.some(page => lowerUrl === page);
      
      if (hasInvalidProtocol || isInvalidPage) {
          return false;
      }
      
      return true;
  }

  savePageVisit(url, title, timeSpent) {
      if (!title || title.trim() === '') {
          return;
      }
      
      const visitData = { url, pageTitle: title, timeSpent };
      
      chrome.storage.local.get('pageVisits', (result) => {
          const pageVisits = Array.isArray(result.pageVisits) ? result.pageVisits : [];
          const category = this.getCategoryForUrl(url);
          visitData.category = category || 'other';
          
          pageVisits.push(visitData);
          chrome.storage.local.set({ pageVisits });
      });
  }

  getCategoryForUrl(url) {
      for (const [category, keywords] of Object.entries(this.keywordToCategoryMap)) {
          if (keywords.some(keyword => url.includes(keyword))) {
              return category;
          }
      }
      return null;
  }

  getPageVisits(sendResponse) {
    chrome.storage.local.get('pageVisits', (result) => {
        const visits = result.pageVisits || [];
        const aggregatedVisits = {};

        visits.forEach((visit) => {
            if (!visit.pageTitle || visit.pageTitle.trim() === '') {
                return;
            }
            
            const key = visit.pageTitle;
            
            if (!aggregatedVisits[key]) {
                aggregatedVisits[key] = {
                    url: visit.url,
                    pageTitle: visit.pageTitle,
                    timeSpent: 0
                };
            } else {
                if (visit.url) {
                    aggregatedVisits[key].url = visit.url;
                }
            }
            aggregatedVisits[key].timeSpent += visit.timeSpent;
        });

        const aggregatedVisitsArray = Object.entries(aggregatedVisits).map(([title, data]) => ({
            url: data.url,
            pageTitle: data.pageTitle,
            timeSpent: data.timeSpent
        }));

        aggregatedVisitsArray.sort((a, b) => b.timeSpent - a.timeSpent);
        sendResponse({ pageVisits: aggregatedVisitsArray });
    });
}

  handleStorageChange(changes, areaName) {
      if (areaName === 'sync') {
          if (changes.categoryTags && changes.categoryTags.newValue) {
              this.categoryTags = changes.categoryTags.newValue;
              this.updateKeywordToCategoryMap();
          }
      }
  }

  clearData() {
      chrome.storage.sync.clear(() => {
          chrome.storage.local.clear(() => {
              this.resetData();
              this.loadCategoryTags();
              this.trackActiveTab();
              console.log('All data has been cleared.');
          });
      });
  }

  clearPageVisits(sendResponse) {
      chrome.storage.local.set({ pageVisits: [] }, () => {
          sendResponse({ success: true });
      });
  }

  startTrackingActiveTab() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
              this.startTracking(tabs[0].id);
          }
      });
  }
}

new PageVisitsTracker();
