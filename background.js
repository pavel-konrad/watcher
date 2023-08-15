// Save data to chrome.storage
function savePageVisitData(ipAddress, url, timeSpent, pageTitle) {
  chrome.storage.local.get({ pageVisits: [] }, function(data) {
    const pageVisits = data.pageVisits;

    // Adding a new page record to the data
    pageVisits.push({
      ipAddress: ipAddress,
      url: url,
      timeSpent: timeSpent,
      pageTitle: pageTitle,
    });

    // Updating data in local storage
    chrome.storage.local.set({ pageVisits: pageVisits }, function() {
      console.log('Data o návštěvě stránky uložena:', pageVisits);
    });
  });
}

// Listening messages from storage
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'savePageVisitData') {
    // Massage processing
    const url = request.url;
    const timeSpent = request.timeSpent;
    const pageTitle = request.pageTitle;

    // Get local IP address
    getLocalIpAddress().then((ipAddress) => {
      savePageVisitData(ipAddress, url, timeSpent, pageTitle);
      sendResponse({ message: 'Data byla uložena.' });
    });
  }

  // Calling sendResponse
  return true;
});

// Get local IP address
async function getLocalIpAddress() {
  try {
    const peerConnection = new RTCPeerConnection({ iceServers: [] });
    const sdpOffer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(sdpOffer);
    
    const localIp = peerConnection.localDescription.sdp.match(/(\d+\.\d+\.\d+\.\d+)/)[0];
    
    peerConnection.close();
    
    return localIp;
  } catch (error) {
    console.error('Chyba při získávání lokální IP adresy:', error);
    return null;
  }
}