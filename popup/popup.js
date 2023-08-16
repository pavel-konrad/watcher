class PopupUI {
  constructor() {
    this.progressBarSocial = document.querySelector('#div-social');
    this.progressBarEducation = document.querySelector('#div-education');
    this.progressBarWork = document.querySelector('#div-work');
    this.progressBarResearch= document.querySelector('#div-research');
    this.progressBarOther = document.querySelector('#div-other');

    this.progressBarSocial.addEventListener('click', () => this.scrollToSection('#detailed-data'));
    this.progressBarEducation.addEventListener('click', () => this.scrollToSection('#detailed-data'));
    this.progressBarWork.addEventListener('click', () => this.scrollToSection('#detailed-data'));
    this.progressBarResearch.addEventListener('click', () => this.scrollToSection('#detailed-data'));
    this.progressBarOther.addEventListener('click', () => this.scrollToSection('#detailed-data'));

    this.clearDataButton = document.querySelector('#clear-data-button');
    this.donateButton = document.querySelector('#donate-button');

    this.clearDataButton.addEventListener('click', () => this.clearData());
    this.donateButton.addEventListener('click', () => this.openDonateLink());

    this.fetchCategorizedPageVisits();

    this.progressBarCategories = {
      '#div-social': 'Social',
      '#div-education': 'Education',
      '#div-work': 'Work',
      '#div-research': 'Research',
      '#div-other': 'Other',
    };
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
  
    progressBarDiv.addEventListener('click', () => this.displayCategorizedData(categoryData));
  }
  displayCategorizedData(categoryData) {
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
        timeSpentDisplay = `${Math.floor(timeSpentInSeconds / 60)}:${(timeSpentInSeconds % 60).toFixed(0)} min.`;
      } else {
        const hours = Math.floor(timeSpentInSeconds / 3600);
        const minutes = Math.floor((timeSpentInSeconds % 3600) / 60);
        timeSpentDisplay = `${hours}:${minutes < 10 ? '0' : ''}${minutes} hours`;
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