// Získání aktuální IP adresy uživatele pomocí externí služby
fetch('https://api.ipify.org?format=json')
  .then(response => response.json())
  .then(data => {
    const userIpAddress = data.ip;
    // Volání funkce pro uložení IP adresy do chrome.storage
    saveIpAddressToStorage(userIpAddress);
  })
  .catch(error => console.error('Chyba při získávání IP adresy:', error));

// Funkce pro uložení IP adresy do chrome.storage
function saveIpAddressToStorage(ipAddress) {
  chrome.storage.local.set({ userIpAddress: ipAddress }, function() {
    console.log('IP adresa uložena:', ipAddress);
  });
}

// Poslouchání zpráv z content skriptu
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'savePageVisitData') {
    // Zpracování zprávy a uložení dat o stránce
    const url = request.url;
    const timeSpent = request.timeSpent;
    savePageVisitData(url, timeSpent);
    sendResponse({ message: 'Data byla uložena.' });
  }
});

// Funkce pro uložení dat o stránce do chrome.storage
function savePageVisitData(url, timeSpent) {
    console.log('Ukládání dat o návštěvě stránky...');
  chrome.storage.local.get({ pageVisits: [] }, function(data) {
    const pageVisits = data.pageVisits;

    // Přidání nového záznamu o stránce do dat
    pageVisits.push({
      url: url,
      timeSpent: timeSpent
    });

    // Aktualizace dat v lokálním úložišti
    chrome.storage.local.set({ pageVisits: pageVisits }, function() {
      console.log('Data o návštěvě stránky uložena:', pageVisits);
    });
  });
}