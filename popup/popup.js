class PopupUI {
  constructor() {
      this.progressBarCategories = {
          '#div-social': 'Social',
          '#div-education': 'Education',
          '#div-work': 'Work',
          '#div-research': 'Research',
          '#div-other': 'Other',
      };
      this.categoryTags = {};
      this.init();
  }

  init() {
      this.loadTags();
      this.initEventListeners();
      this.fetchPageVisits();
      this.trackPageVisits();
  }

  addClickEvent(selector, callback) {
      const element = document.querySelector(selector);
      if (element) {
          element.addEventListener('click', callback);
      }
  }

  initEventListeners() {
      this.addClickEvent('#clear-data-button', () => this.clearData());
      this.addClickEvent('#donate-button', () => this.openDonateLink());
      this.addClickEvent('#send-tags-button', () => this.sendTagsToBackground());

      for (const selector in this.progressBarCategories) {
          this.addClickEvent(selector, () => {
              this.scrollToSection('#detailed-data');
              this.fetchNewTags(this.progressBarCategories[selector]);
          });
      }
  }

  loadTags() {
      chrome.storage.sync.get('categoryTags', (result) => {
          this.categoryTags = result.categoryTags || {
              social: ['facebook', 'instagram', 'youtube'],
              education: ['wikipedia', 'udemy'],
              work: ['office'],
              research: ['chatgpt', 'scholar'],
              other: []
          };
          Object.keys(this.categoryTags).forEach(category => this.updateTagsDisplay(category));
      });
  }

  sendTagsToBackground() {
      chrome.storage.sync.set({ categoryTags: this.categoryTags }, () => {
          if (chrome.runtime.lastError) {
              console.error('Error sending tags:', chrome.runtime.lastError);
          }
      });
  }

  fetchNewTags(category) {
      const tags = this.categoryTags[category.toLowerCase()] || [];
      tags.forEach(tag => {
          this.addKeywordToCategory(tag, category);
      });
      this.updateTagsDisplay(category);
  }

  scrollToSection(sectionId) {
      document.querySelector(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  }

  fetchPageVisits() {
      chrome.runtime.sendMessage({ action: 'getPageVisits' }, (response) => {
          if (response?.pageVisits) {
              this.categorizePageVisits(response.pageVisits);
          } else {
              console.error('Error fetching page visits.');
          }
      });
  }

  categorizePageVisits(pageVisits) {
      this.loadKeywordToCategoryMap((keywordToCategoryMap) => {
          const categorizedData = { other: [] };
          const totalTimeSpent = { other: 0 };

          pageVisits.forEach(visit => {
              let category = this.categorizePageVisit(visit.url, keywordToCategoryMap);
              if (!category) {
                  category = 'other';
              }
              if (!categorizedData[category]) {
                  categorizedData[category] = [];
                  totalTimeSpent[category] = 0;
              }

              const existingVisit = categorizedData[category].find(v => v.url === visit.url);
              if (existingVisit) {
                  existingVisit.timeSpent += visit.timeSpent;
              } else {
                  categorizedData[category].push({ 
                      ...visit, 
                      timeSpent: visit.timeSpent 
                  });
              }
              totalTimeSpent[category] += visit.timeSpent;
          });

          Object.keys(categorizedData).forEach(category => 
              categorizedData[category].sort((a, b) => b.timeSpent - a.timeSpent)
          );

          const categoryPercentages = this.calculateCategoryPercentages(totalTimeSpent, pageVisits);
          this.updateUI(categorizedData, categoryPercentages);
      });
  }

  loadKeywordToCategoryMap(callback) {
      chrome.storage.local.get('keywordToCategoryMap', (data) => {
          const keywordToCategoryMap = data.keywordToCategoryMap || {};
          callback(keywordToCategoryMap);
      });
  }

  categorizePageVisit(url, keywordToCategoryMap) {
      return Object.entries(keywordToCategoryMap).find(([category, keywords]) =>
          keywords.some(keyword => url.toLowerCase().includes(keyword.toLowerCase()))
      )?.[0] || null;
  }

  trackPageVisits() {
      chrome.runtime.sendMessage({ action: 'trackPageVisits' }, (response) => {
          if (!response?.success) console.error('Error tracking visited pages.');
      });
  }

  updateUI(categorizedData, categoryPercentages) {
    const totalTimeSpent = {};

    for (const [selector, categoryName] of Object.entries(this.progressBarCategories)) {
        const categoryKey = categoryName.toLowerCase();
        const percentage = categoryPercentages[categoryKey] || 0;
        this.updateProgressBar(selector, percentage, categorizedData[categoryKey] || []);

        const categoryTimeSpent = categorizedData[categoryKey]?.reduce((total, visit) => total + visit.timeSpent, 0) || 0;
        totalTimeSpent[categoryKey] = categoryTimeSpent;
    }

    this.displayTotalTimeSpent(totalTimeSpent);
}



  updateProgressBar(selector, percentage, categoryData) {
      const progressBarDiv = document.querySelector(selector);
      if (progressBarDiv) {
          progressBarDiv.style.width = `${percentage}%`;
          progressBarDiv.innerHTML = `${this.progressBarCategories[selector]}: ${percentage.toFixed(0)}%`;
          progressBarDiv.addEventListener('click', () => this.displayCategorizedData(categoryData, this.progressBarCategories[selector]));
      }
  }

  displayTotalTimeSpent(totalTimeSpent) {
      for (const [selector, categoryName] of Object.entries(this.progressBarCategories)) {
          const categoryKey = categoryName.toLowerCase();
          const totalSpent = this.formatTime(totalTimeSpent[categoryKey] || 0);
          const totalDisplayElement = document.querySelector(`#total-time-${categoryKey}`);

          if (totalDisplayElement) {
              totalDisplayElement.innerHTML = `Total time: ${totalSpent}`;
          }
      }
  }

  displayCategorizedData(categoryData, categoryName) {
    const detailedDataContainer = document.querySelector('#detailed-data');
    
    const totalTime = categoryData.reduce((total, visit) => total + visit.timeSpent, 0);
    detailedDataContainer.innerHTML = `<div class="total-time"><p>Total time for ${categoryName}: ${this.formatTime(totalTime)}</p></div>`;
    
    detailedDataContainer.innerHTML += categoryData.map(visit => `
        <div class="detailed-item">
            <a href="${visit.url}" target="_blank">${visit.pageTitle || visit.url}</a> - 
            <br>Time spent: ${this.formatTime(visit.timeSpent)}
        </div>
    `).join('');
}


  formatTime(timeSpentInMilliseconds) {
      const timeSpentInSeconds = timeSpentInMilliseconds / 1000;
      return timeSpentInSeconds < 60 ? `${timeSpentInSeconds.toFixed(0)} sec.`
          : timeSpentInSeconds < 3600 ? `${Math.floor(timeSpentInSeconds / 60)} min.`
          : `${Math.floor(timeSpentInSeconds / 3600)}h ${Math.floor((timeSpentInSeconds % 3600) / 60)} min.`;
  }

  calculateCategoryPercentages(totalTimeSpent, pageVisits) {
      const totalSpentTime = pageVisits.reduce((sum, visit) => sum + visit.timeSpent, 0);
      return Object.fromEntries(Object.entries(totalTimeSpent).map(([category, time]) => [category, (time / totalSpentTime) * 100]));
  }

  updateTagsDisplay(category) {
      const tagsContainer = document.getElementById(`tags-${category}`);
      if (tagsContainer) {
          tagsContainer.innerHTML = this.categoryTags[category].map(tag => `
              <span class="tag">${tag} <span class="remove-tag">✖</span></span>
          `).join('') + `<button class="add-tag-button">+</button>`;

          tagsContainer.querySelectorAll('.remove-tag').forEach((button, index) =>
              button.addEventListener('click', () => this.removeTag(category, this.categoryTags[category][index])));

          tagsContainer.querySelector('.add-tag-button').addEventListener('click', () => this.promptNewTag(category));
      }
  }

  promptNewTag(category) {
      const tagsContainer = document.getElementById(`tags-${category}`);
      const input = document.createElement('input');
      input.placeholder = 'Enter new tag';
      input.style.display = 'inline-block';
      const addButton = tagsContainer.querySelector('.add-tag-button');
      tagsContainer.insertBefore(input, addButton);
      input.focus();

      input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && input.value.trim()) {
              this.addKeywordToCategory(input.value.trim(), category);
              input.remove();
          }
      });

      input.addEventListener('blur', () => input.remove());
  }

  addKeywordToCategory(tag, category) {
      const categoryKey = category.toLowerCase();
      if (!this.categoryTags[categoryKey]) {
          console.error(`Category "${categoryKey}" does not exist.`);
          return;
      }
      if (tag.trim() === '') {
          console.error(`Tag cannot be empty.`);
          return;
      }
      if (categoryKey !== 'other') {
          if (!this.categoryTags[categoryKey].includes(tag)) {
              this.categoryTags[categoryKey].push(tag);
              this.updateTagsDisplay(categoryKey);
              this.sendTagsToBackground();
          }
      } else {
          console.error(`Cannot add tag to category "Other". Tag: ${tag}`);
      }
  }

  removeTag(category, tag) {
      const categoryKey = category.toLowerCase();
      if (!this.categoryTags[categoryKey]) return;

      this.categoryTags[categoryKey] = this.categoryTags[categoryKey].filter(t => t !== tag);
      this.updateTagsDisplay(categoryKey);
      this.sendTagsToBackground();
  }

  clearData() {
      if (confirm('Are you sure you want to clear all data?')) {
          chrome.storage.sync.clear(() => {
              this.categoryTags = {};
              this.updateUI({}, {});
              alert('All data has been cleared.');
          });
      }
  }

  openDonateLink() {
      window.open('https://www.donate-link.com', '_blank');
  }
}

const popupUI = new PopupUI();
