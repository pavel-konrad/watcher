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