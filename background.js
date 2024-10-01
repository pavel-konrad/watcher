class PageVisitsTracker {
  constructor() {
      this.activeTabId = null;
      this.activeStartTime = null;
      this.keywordToCategoryMap = {};
      this.categoryTags = {};
      this.currentlyTrackingUrls = new Set();
      this.init();
  }

  init() {
      this.loadKeywordToCategoryMap();
      this.loadCategoryTags();
      this.setupListeners();
  }

  setupListeners() {
      chrome.tabs.onActivated.addListener(this.handleTabActivated.bind(this));
      chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
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
      this.categoryTags = {
          social: [],
          education: [],
          work: [],
          research: [],
          other: []
      };
      this.keywordToCategoryMap = {};
      chrome.storage.local.set({ pageVisits: [] });
      this.updateKeywordToCategoryMap();
  }

  updateKeywordToCategoryMap() {
      Object.entries(this.categoryTags).forEach(([category, keywords]) => {
          this.keywordToCategoryMap[category] = keywords;
      });
      chrome.storage.local.set({ keywordToCategoryMap: this.keywordToCategoryMap });
  }

  handleMessage(message, sender, sendResponse) {
      if (message.action === 'trackPageVisits') {
          this.trackActiveTab();
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
      this.trackActiveTab();
      this.activeTabId = activeInfo.tabId;
      this.activeStartTime = Date.now();
  }

  handleTabUpdated(tabId, changeInfo, tab) {
      if (tab.active && changeInfo.url) {
          this.trackActiveTab();
          this.activeTabId = tabId;
          this.activeStartTime = Date.now();
      }
  }

  trackActiveTab() {
      if (this.activeTabId && this.activeStartTime) {
          chrome.tabs.get(this.activeTabId, (tab) => {
              if (tab?.url) {
                  const timeSpent = Date.now() - this.activeStartTime;
                  this.savePageVisit(tab.url, tab.title, timeSpent);
              }
          });
      }
  }

  savePageVisit(url, title, timeSpent) {
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

        visits.forEach(visit => {
            if (!aggregatedVisits[visit.url]) {
                aggregatedVisits[visit.url] = {
                    pageTitle: visit.pageTitle,
                    timeSpent: 0
                };
            }
            aggregatedVisits[visit.url].timeSpent += visit.timeSpent;
        });

        const aggregatedVisitsArray = Object.entries(aggregatedVisits).map(([url, data]) => ({
            url,
            pageTitle: data.pageTitle,
            timeSpent: data.timeSpent
        }));

        aggregatedVisitsArray.sort((a, b) => b.timeSpent - a.timeSpent);
        sendResponse({ pageVisits: aggregatedVisitsArray });
    });
}

  handleStorageChange(changes, areaName) {
      if (areaName === 'sync') {
          if (changes.categoryTags) {
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
              alert('All data has been cleared.');
          });
      });
  }

  clearPageVisits(sendResponse) {
      chrome.storage.local.set({ pageVisits: [] }, () => {
          sendResponse({ success: true });
      });
  }
}

new PageVisitsTracker();
