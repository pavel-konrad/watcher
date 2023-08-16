class PageVisitsTracker {
  constructor() {
    this.activeTabId = null;
    this.activeStartTime = null;
    this.init();
  }

  init = () => { // Toto je arrow funkce
    chrome.tabs.onActivated.addListener(this.handleTabActivated);
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated);
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'savePageVisitData') {
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
        return true; // Musíme vrátit true, aby bylo možné zavolat sendResponse asynchronně
      }
    });
  }
  handleTabActivated = (activeInfo) => {
    if (this.activeTabId !== null) {
      const endTime = new Date().getTime();
      const timeSpent = endTime - this.activeStartTime;
  
      // Verify ID tab
      if (typeof this.activeTabId === 'number') {
        chrome.tabs.get(this.activeTabId, (tab) => {
          if (chrome.runtime.lastError || !tab || !tab.url) {
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

  getUserIpAddress() {
    return fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => data.ip);
  }

  savePageVisitData(ipAddress, url, timeSpent, pageTitle) {
    // Pokud některá z potřebných informací chybí, neukládáme záznam
    if (!url || !timeSpent || !pageTitle) {
      console.log('Missing data, not saving:', { ipAddress, url, timeSpent, pageTitle });
      return;
    }
  
    chrome.storage.local.get({ pageVisits: [] }, data => {
      const pageVisits = data.pageVisits;
  
      pageVisits.unshift({
        ipAddress: ipAddress,
        url: url,
        timeSpent: timeSpent,
        pageTitle: pageTitle,
      });
  
      chrome.storage.local.set({ pageVisits: pageVisits }, () => {
        console.log('Page visits stored:', pageVisits);
      });
    });
  }

  async getCategorizedPageVisits() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['pageVisits'], data => {
        const pageVisits = data.pageVisits || [];

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