class PopupUI {
  constructor() {
    this.progressBarCategories = {
      '#div-social': 'Social',
      '#div-education': 'Education',
      '#div-work': 'Work',
      '#div-research': 'Research',
      '#div-other': 'Other',
    };

    // Iterace přes progress bar kategorie a přidání posluchačů
    for (const selector in this.progressBarCategories) {
      const progressBar = document.querySelector(selector);
      if (progressBar) {
        progressBar.addEventListener('click', () => this.scrollToSection('#detailed-data'));
      }
    }

    this.addClickEvent('#clear-data-button', () => this.clearData());
    this.addClickEvent('#donate-button', () => this.openDonateLink());

    this.fetchCategorizedPageVisits();

   
  }
  addClickEvent(selector, callback) {
    const element = document.querySelector(selector);
    if (element) {
      element.addEventListener('click', callback);
    }
  }
  scrollToSection(sectionId) {
    const sectionElement = document.querySelector(sectionId);
    if (sectionElement) {
      const sectionTop = sectionElement.offsetTop;
      window.scrollTo({ top: sectionTop, behavior: 'smooth' });
    }
  }

  fetchCategorizedPageVisits() {
    chrome.runtime.sendMessage({ type: 'getCategorizedPageVisits' }, (response) => {
      const categorizedData = response.categorizedData;
      const categoryPercentages = response.categoryPercentages;
      this.updateUI(categorizedData, categoryPercentages);
    });
  }

  updateUI(categorizedData, categoryPercentages) {
    
    // Zde doplňte kód pro zobrazení dat v popupu
    this.displayCategorizedData(categorizedData.social);
    this.updateProgressBar('#div-social', categoryPercentages.social, categorizedData.social);
    this.updateProgressBar('#div-education', categoryPercentages.education, categorizedData.education);
    this.updateProgressBar('#div-work', categoryPercentages.work, categorizedData.work);
    this.updateProgressBar('#div-research', categoryPercentages.research, categorizedData.research);
    this.updateProgressBar('#div-other', categoryPercentages.other, categorizedData.other);
  }
  updateProgressBar(progressBarId, percentage, categoryData) {
    const progressBarDiv = document.querySelector(progressBarId);
    progressBarDiv.style.width = `${percentage}%`;
    
    // Získat název kategorie
    const categoryName = this.progressBarCategories[progressBarId] || 'Unknown';
    
    if (typeof percentage === 'number') {
      progressBarDiv.innerHTML = `${categoryName}: ${percentage.toFixed(0)}%`; // zobrazit procentuální hodnotu v divu
    } else {
      progressBarDiv.innerHTML = `${categoryName}: none`;
    }
  
    progressBarDiv.addEventListener('click', () => this.displayCategorizedData(categoryData, categoryName));
    

  }

  
  displayCategorizedData(categoryData, categoryName) {
    const detailedDataContainer = document.querySelector('#detailed-data');
    detailedDataContainer.innerHTML = ''; // Vyčistit obsah kontejneru

    categoryData.forEach(visit => {
      const detailedItem = document.createElement('div');
      detailedItem.classList.add('detailed-item');
  
      const visitUrl = document.createElement('a');
      visitUrl.href = visit.url;
      visitUrl.textContent = visit.pageTitle || visit.url;
      visitUrl.target = '_blank';
  
      const timeSpentInSeconds = visit.timeSpent / 1000;
      let timeSpentDisplay;
      
      if (timeSpentInSeconds < 60) {
        timeSpentDisplay = `${timeSpentInSeconds.toFixed(0)} sec.`;
      } else if (timeSpentInSeconds < 3600) { // Méně než hodina
        timeSpentDisplay = `${Math.floor(timeSpentInSeconds / 60)} min.`;
      } else {
        const hours = Math.floor(timeSpentInSeconds / 3600);
        const minutes = Math.floor((timeSpentInSeconds % 3600) / 60);
        timeSpentDisplay = `${hours}h ${minutes < 10 ? '0' : ''}${minutes} min`;
      }
      

        const visitTimeSpent = document.createElement('p');
        visitTimeSpent.textContent = 'Time spent: ';
    
        const timeSpan = document.createElement('span');
        timeSpan.textContent = timeSpentDisplay;
    
        visitTimeSpent.appendChild(timeSpan);
  
      detailedItem.appendChild(visitUrl);
      detailedItem.appendChild(visitTimeSpent);
  
      detailedDataContainer.appendChild(detailedItem);
    });
  }


  displayKeywords(keywords) {
    console.log("Starting displayKeywords"); // Kontrolní výpis
  
    const keywordsContainer = document.querySelector('#keywords-container');
    keywordsContainer.innerHTML = ''; // Vyčistit obsah kontejneru
  
    const formDiv = this.createKeywordForm('Your Keywords');
    const keywordsDiv = document.createElement('div');
    keywordsDiv.classList.add('keywords-div');
  
    keywords.forEach(keyword => {
      const keywordButton = document.createElement('button');
      keywordButton.textContent = keyword;
      keywordButton.addEventListener('click', () => {
        this.removeKeyword(keyword);
      });
      keywordsDiv.appendChild(keywordButton);
    });
  
    formDiv.appendChild(keywordsDiv);
  
    console.log("Appending formDiv to keywordsContainer"); // Kontrolní výpis
    keywordsContainer.appendChild(formDiv);
  }
  
  createKeywordForm(categoryName) {
    console.log("Starting createKeywordForm with category:", categoryName); // Kontrolní výpis
  
    const formDiv = document.createElement('div');
    formDiv.classList.add('keyword-form-div');
  
    const heading = document.createElement('h2');
    heading.textContent = categoryName;
    formDiv.appendChild(heading);
  
    const form = document.createElement('form');
    form.id = 'keyword-form';
  
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'keywords';
    input.placeholder = 'Enter keywords...';
  
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Submit';
  
    form.appendChild(input);
    form.appendChild(submitButton);
  
    console.log("Appending form to formDiv"); // Kontrolní výpis
    formDiv.appendChild(form);
  
    return formDiv;
  }
addKeyword(keyword) {
  chrome.runtime.sendMessage({ type: 'addKeyword', keyword }, (response) => {
    if (response.success) {
      console.log("Keyword added successfully");
    } else {
      console.error("Failed to add keyword");
    }
  });
}
removeKeyword(keyword) {
  chrome.runtime.sendMessage({ type: 'removeKeyword', keyword }, (response) => {
    if (response.success) {
      console.log("Keyword removed successfully");
      this.fetchKeywords(); // Update the displayed keywords
    } else {
      console.error("Failed to remove keyword");
    }
  });
}
  clearData() {
    chrome.runtime.sendMessage({ type: 'clearAllData' }, (response) => {
      if (response.message === 'Data cleared.') {
        window.location.reload(); // Refresh popup after clearing data
      }
    });
  }

  openDonateLink() {
    chrome.tabs.create({ url: 'https://www.paypal.com/donate/?hosted_button_id=3SXLYVB58ADJ2' });
  }
}
const scrollToTopButton = document.getElementById("scrollToTop");

// Funkce pro zobrazení tlačítka, když uživatel posune dolů
window.onscroll = function() {
  if (document.body.scrollTop > 1200 || document.documentElement.scrollTop > 300) {
    scrollToTopButton.style.display = "block";
  } else {
    scrollToTopButton.style.display = "none";
  }
};

// Funkce pro posunutí zpět nahoru
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// Připojení události kliknutí
scrollToTopButton.addEventListener("click", scrollToTop);

document.addEventListener('DOMContentLoaded', () => {
  new PopupUI();
});