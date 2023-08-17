class PageVisitsTracker {
  
  constructor() {
    this.activeTabId = null;
    this.activeStartTime = null;
    this.init();
  }

  init = () => {
    chrome.storage.local.get(['keywordToCategoryMap'], data => {
      this.keywordToCategoryMap = data.keywordToCategoryMap || {
        social: ['facebook.com', 'twitter.com', 'instagram.com'],
        education: ['coursera.org', 'udemy.com', 'khanacademy.org'],
        work: ['slack', 'microsoft', 'mail', 'email'],
        research: ['paper', 'scholar', 'article'],
        // Další klíčová slova a kategorie...
        
      };
      
    });
    
    chrome.tabs.onActivated.addListener(this.handleTabActivated);
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated);

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'getKeywords') {
        this.handleGetKeywords(sendResponse);
        return true;
      } else if (request.type === 'savePageVisitData') {
        this.handleSavePageVisitData(request, sendResponse);
        return true;
      } else if (request.type === 'getCategorizedPageVisits') {
        this.handleGetCategorizedPageVisits(sendResponse);
        return true;
      } else if (request.type === 'clearAllData') {
        this.clearAllData(success => {
          if (success) {
            sendResponse({ message: 'Data cleared.' });
          } else {
            sendResponse({ message: 'Failed to clear data.' });
          }
        });
        return true;
      }
    });
  }
  getKeywordsByCategory(category) {
    return this.keywordToCategoryMap[category] || [];
  }
  

  removeKeywordFromCategory(keyword, category) {
    const keywords = this.keywordToCategoryMap[category];
    const index = keywords.indexOf(keyword);
    if (index > -1) {
      keywords.splice(index, 1);
      chrome.storage.local.set({ keywordToCategoryMap: this.keywordToCategoryMap }, () => {
        console.log(`Keyword ${keyword} removed from category ${category}`);
      });
      return true;
    }
    console.log(`Keyword ${keyword} not found in category ${category}`);
    return false;
  }
  addKeywordToCategory(keyword, category) {
    this.keywordToCategoryMap[category].push(keyword);
    chrome.storage.local.set({ keywordToCategoryMap: this.keywordToCategoryMap }, () => {
      console.log(`Keyword ${keyword} added to category ${category}`);
    });
    return true;
  }
  handleTabActivated = (activeInfo) => {
  if (this.activeTabId !== null) {
    const endTime = new Date().getTime();
    const timeSpent = endTime - this.activeStartTime;

    if (typeof this.activeTabId === 'number') {
      chrome.tabs.get(this.activeTabId, (tab) => {
        if (chrome.runtime.lastError || !tab || !tab.url || tab.url.startsWith('chrome://')) {
          console.warn(`Tab ${this.activeTabId} not found, or is a chrome URL, or no URL property:`, chrome.runtime.lastError);
          return; // V případě chyby, chrome URL nebo chybějící URL se zbytek kódu neprovede
        }
        this.savePageVisitData(null, tab.url, timeSpent, tab.title);
      });
    }
  }

  this.activeTabId = activeInfo.tabId;
  this.activeStartTime = new Date().getTime();
};

handleTabUpdated = (tabId, changeInfo, tab) => {
  if (tabId === this.activeTabId && changeInfo.status === 'complete') {
    this.activeStartTime = new Date().getTime();
  }
};
  clearAllData(callback) {
    chrome.storage.local.remove(['pageVisits'], () => {
      if (chrome.runtime.lastError) {
        console.error('Chyba při mazání dat:', chrome.runtime.lastError);
        callback(false);
      } else {
        console.log('Všechna data byla vymazána.');
        callback(true);
      }
    });
  }

  handleSavePageVisitData(request, sendResponse) {
    const url = request.url;
    const timeSpent = request.timeSpent;
    const pageTitle = request.pageTitle;

    this.savePageVisitData(null, url, timeSpent, pageTitle); // Null jako IP adresa
    sendResponse({ message: 'Data was stored.' });
  }

  handleGetCategorizedPageVisits(sendResponse) {
    this.getCategorizedPageVisits()
      .then(({ categorizedData, categoryPercentages }) => {
        sendResponse({ categorizedData, categoryPercentages });
      })
      .catch(error => {
        console.error('Error getting category data', error);
      });
  }
 handleGetKeywords = (sendResponse) => {
    const keywordToCategoryMap = {
      social: ['facebook.com', 'twitter.com', 'instagram.com'],
      education: ['coursera.org', 'udemy.com', 'khanacademy.org'],
      work: ['slack', 'microsoft', 'mail', 'email'],
      research: ['paper', 'scholar', 'article'],
      // Další klíčová slova a kategorie...
    };
    const keywords = Object.values(this.keywordToCategoryMap).flat();
  sendResponse({ keywords: keywords });
  
};
  
  getUserIpAddress() {
    return fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => data.ip);
  }

  savePageVisitData(ipAddress, url, timeSpent, pageTitle) {
    if (!url || !timeSpent || !pageTitle) {
      console.log('Missing data, not saving:', { ipAddress, url, timeSpent, pageTitle });
      return;
    }
  
    chrome.storage.local.get({ pageVisits: [] }, data => {
      const pageVisits = data.pageVisits;
  
      // Najděte existující záznam s touto URL
      const existingVisitIndex = pageVisits.findIndex(visit => visit.url === url);
  
      if (existingVisitIndex > -1) {
        // Pokud záznam existuje, aktualizujte čas strávený
        pageVisits[existingVisitIndex].timeSpent += timeSpent;
      } else {
        // Pokud záznam neexistuje, přidejte nový záznam
        pageVisits.unshift({
          ipAddress: ipAddress,
          url: url,
          timeSpent: timeSpent,
          pageTitle: pageTitle,
        });
      }
      pageVisits.sort((a, b) => b.timeSpent - a.timeSpent);
      chrome.storage.local.set({ pageVisits: pageVisits }, () => {
        console.log('Page visits stored:', pageVisits);
      });
    });
  }

async getCategorizedPageVisits() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['pageVisits'], data => {
      const pageVisits = Object.values(data.pageVisits || {});

      const categorizedData = {
        social: [],
        education: [],
        work: [],
        research: [],
        other: [],
      };

      pageVisits.forEach(visit => {
        const category = this.categorizePageVisit(visit);
        categorizedData[category].push(visit);
      });

      const categoryPercentages = this.calculateCategoryPercentages(categorizedData);

      resolve({ categorizedData, categoryPercentages });
    });
  });
}

  categorizePageVisit(visit) {
    const url = visit.url || ''; // Ověřte, zda url existuje
    const title = visit.pageTitle ? visit.pageTitle.toLowerCase() : ''; // Ověřte, zda pageTitle existuje
  
    const keywordToCategoryMap = {
      social: ['facebook.com', 'twitter.com', 'instagram.com'],
      education: ['coursera.org', 'udemy.com', 'khanacademy.org'],
      work: ['slack', 'microsoft', 'mail', 'email'],
      research: ['paper', 'scholar', 'article'],
      // Další klíčová slova a kategorie...
    };
   

    for (const category in keywordToCategoryMap) {
      const keywords = keywordToCategoryMap[category];
      if (keywords) { // Ověřte, zda klíčová slova existují
        for (const keyword of keywords) {
          if (url.includes(keyword) || title.includes(keyword)) {
            return category;
          }
        }
      }
    }
      
    return 'other';
  }
  calculateCategoryPercentages(categorizedData) {
    const totalVisits = Object.values(categorizedData).reduce((total, categoryData) => total + categoryData.length, 0);
  
    const categoryPercentages = {};
    for (const category in categorizedData) {
      const categoryData = categorizedData[category];
      const categoryPercentage = (categoryData.length / totalVisits) * 100;
      categoryPercentages[category] = categoryPercentage;
    }
  
    return categoryPercentages;
  }
  
}


new PageVisitsTracker();
