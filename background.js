class PageVisitsTracker {
  constructor() {
    this.init();
  }

  init = () => { // Toto je arrow funkce
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

    this.getUserIpAddress()
      .then(userIpAddress => {
        this.savePageVisitData(userIpAddress, url, timeSpent, pageTitle);
        sendResponse({ message: 'Data was stored.' });
      })
      .catch(error => {
        console.error('Error getting IP', error);
      });
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
    chrome.storage.local.get({ pageVisits: [] }, data => {
      const pageVisits = data.pageVisits;

      pageVisits.unshift({
        ipAddress: ipAddress,
        url: url,
        timeSpent: timeSpent,
        pageTitle: pageTitle,
      });

      chrome.storage.local.set({ pageVisits: pageVisits }, () => {
        console.log('Page visits store:', pageVisits);
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
    const url = visit.url;
    const title = visit.pageTitle.toLowerCase(); // Předpokládá se, že klíčová slova jsou malými písmeny
  
    const keywordToCategoryMap = {
      social: ['facebook.com', 'twitter.com', 'instagram.com'],
      education: ['coursera.org', 'udemy.com', 'khanacademy.org'],
      work: ['slack', 'microsoft', 'mail', 'email'],
      research: ['paper', 'scholar', 'article'],
      // Další klíčová slova a kategorie...
    };
  
    for (const category in keywordToCategoryMap) {
      const keywords = keywordToCategoryMap[category];
      for (const keyword of keywords) {
        if (url.includes(keyword) || title.includes(keyword)) { // Kontroluje klíčová slova jak v URL, tak v názvu stránky
          return category;
        }
      }
    }
    
    return 'other'; // Pokud nebyla nalezena žádná odpovídající klíčová slova, vrátí kategorii "other"
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