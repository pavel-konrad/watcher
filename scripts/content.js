// Získání aktuální IP adresy uživatele pomocí externí služby
fetch('https://api.ipify.org?format=json')
  .then(response => response.json())
  .then(data => {
    const userIpAddress = data.ip;
    saveIpAddressAndPageData(userIpAddress);
  })
  .catch(error => console.error('Chyba při získávání IP adresy:', error));

// Funkce pro uložení IP adresy a dat o stránce do chrome.storage
function saveIpAddressAndPageData(userIpAddress) {
  // Získání aktuální URL stránky
  const currentUrl = window.location.href;

  // Získání času stráveného na aktuální stránce
  const startTime = new Date().getTime();

  // Přepnutí na jinou stránku (např. kliknutím na odkaz)
  const unloadListener = function() {
    const endTime = new Date().getTime();
    const timeSpent = endTime - startTime;

  
    // Uložení dat o stránce do lokálního úložiště
    savePageVisitData(userIpAddress, currentUrl, timeSpent);

    // Odebrání posluchače po jeho provedení
    window.removeEventListener('beforeunload', unloadListener);
  };

  window.addEventListener('beforeunload', unloadListener);
}
// Funkce pro uložení dat o stránce do chrome.storage
function savePageVisitData(ipAddress, url, timeSpent) {
  chrome.storage.local.get({ pageVisits: [] }, function(data) {
    const pageVisits = data.pageVisits;

    // Přidání nového záznamu o stránce do dat
    pageVisits.push({
      ipAddress: ipAddress,
      url: url,
      timeSpent: timeSpent
    });

    // Aktualizace dat v lokálním úložišti
    chrome.storage.local.set({ pageVisits: pageVisits }, function() {
      console.log('Data o návštěvě stránky uložena:', pageVisits);
    });
  });
}