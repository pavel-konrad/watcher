class PageVisitTracker {
  constructor() {
    this.startTracking();
  }

  startTracking() {
    this.currentUrl = window.location.href;
    this.pageTitle = document.title;
    this.startTime = new Date().getTime();

    const tabChangedListener = () => {
      const endTime = new Date().getTime();
      const timeSpent = endTime - this.startTime;
      this.savePageVisitData(timeSpent);
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        tabChangedListener();
      } else {
        this.startTime = new Date().getTime();
        this.currentUrl = window.location.href;
        this.pageTitle = document.title;
      }
    });

    window.addEventListener('beforeunload', tabChangedListener);
  }

  savePageVisitData(timeSpent) {
    // Ověřte, zda je záznam jedinečný (například podle URL a času)
    if (this.currentUrl !== this.lastSavedUrl || timeSpent !== this.lastSavedTimeSpent) {
      chrome.runtime.sendMessage(
        {
          type: 'savePageVisitData',
          url: this.currentUrl,
          timeSpent: timeSpent,
          pageTitle: this.pageTitle,
        },
        response => {
          console.log(response.message);
        }
      );

      // Uložte aktuální URL a čas, abyste mohli později ověřit jedinečnost
      this.lastSavedUrl = this.currentUrl;
      this.lastSavedTimeSpent = timeSpent;
    }
  }
}

window.onload = function() {
  new PageVisitTracker();
}

