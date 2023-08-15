class PageVisitTracker {
  constructor() {
    this.startTracking();
  }

  startTracking() {
    this.currentUrl = window.location.href;
    this.pageTitle = document.title;
    this.startTime = new Date().getTime();

    const unloadListener = () => {
      const endTime = new Date().getTime();
      const timeSpent = endTime - this.startTime;
      this.savePageVisitData(timeSpent);
      window.removeEventListener('beforeunload', unloadListener);
    };

    window.addEventListener('beforeunload', unloadListener);
  }

  savePageVisitData(timeSpent) {
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
  }
}

new PageVisitTracker();
