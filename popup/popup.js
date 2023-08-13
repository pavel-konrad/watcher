document.addEventListener('DOMContentLoaded', function() {
chrome.storage.local.get({ pageVisits: [] }, function(data) {
    const pageVisits = data.pageVisits || [];


    const ul = document.querySelector("ul");

    // Pro každou návštěvu vytvořte novou položku seznamu
    pageVisits.forEach(function(visit) {
        const li = document.createElement("li");
        li.textContent = `Stránka: ${visit.url}, Čas strávený: ${visit.timeSpent} ms`;
        ul.appendChild(li);
        
    });
    console.log(pageVisits)
});
});
