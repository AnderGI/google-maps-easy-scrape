document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        const actionButton = document.getElementById('actionButton');
        const downloadCsvButton = document.getElementById('downloadCsvButton');
        const resultsTable = document.getElementById('resultsTable');
        const filenameInput = document.getElementById('filenameInput');
        const messageEl = document.getElementById('message')

        if (currentTab && currentTab.url.includes("://www.google.com/maps/search")) {
            const DEFAULT_MESSAGE_TEXT = "Let's scrape Google Maps!"
            messageEl.textContent = DEFAULT_MESSAGE_TEXT;
            actionButton.disabled = false;
            actionButton.classList.add('enabled');
        } else {
            
            messageEl.innerHTML = '';
            var linkElement = document.createElement('a');
            const GOOGLE_MAPS_LINK = 'https://www.google.com/maps/search/';
            linkElement.href = GOOGLE_MAPS_LINK;
            const GO_TO_GOOGLE_MAPS_TEXT = "Go to Google Maps Search."
            linkElement.textContent = GO_TO_GOOGLE_MAPS_TEXT;
            linkElement.target = '_blank'; 
            messageEl.appendChild(linkElement);
            actionButton.style.display = 'none'; 
            downloadCsvButton.style.display = 'none';
            filenameInput.style.display = 'none'; 
        }

        actionButton.addEventListener('click', function() {
            chrome.scripting.executeScript({
                target: {tabId: currentTab.id},
                function: scrapeData
            }, function(results) {
                while (resultsTable.firstChild) {
                    resultsTable.removeChild(resultsTable.firstChild);
                }

                // Define and add headers to the table
                const headers = ['title', 'rating', 'reviews', 'address', 'address', 'industry', 'web'];
                const headerRow = document.createElement('tr');
                headers.forEach(headerText => {
                    const header = document.createElement('th');
                    header.textContent = headerText;
                    headerRow.appendChild(header);
                });
                
                resultsTable.appendChild(headerRow);

                if (!results || !results[0] || !results[0].result) return;
                
                const toUseData = results[0].result;

                toUseData.forEach(function(item) {
                    const row = document.createElement('tr');
                    headers.forEach(key => {
                        const cell = document.createElement('td');
                        cell.textContent = item[key] || '';
                        row.appendChild(cell); 
                    })
                    resultsTable.appendChild(row);
                });

                if (results && results[0] && results[0].result && results[0].result.length > 0) {
                    downloadCsvButton.disabled = false;
                }
            });
        });

        downloadCsvButton.addEventListener('click', function() {
            const csv = tableToCsv(resultsTable); 
            const filename = filenameInput.value.trim();
            if (!filename) {
                filename = 'google-maps-data.csv'; 
            } else {
                const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]/gi;
                filename = filename.replace(NON_ALPHANUMERIC_REGEX, '_').toLowerCase() + '.csv';
            }
            downloadCsv(csv, filename); 
        });

    });
});


function scrapeData() {
    const links = Array.from(document.querySelectorAll('a[href^="https://www.google.com/maps/place"]'));
    return links.map(link => {
        const container = link.closest('[jsaction*="mouseover:pane"]');
        const title = container ? container.querySelector('.fontHeadlineSmall').textContent : '';
        let rating = '';
        let reviews = ''
        let address = '';
        let phone = ''
        let industry = ''
        let web = ''
        
        if (container) {
            const personalDataMinimumRootEl= container.querySelector('div.fontBodyMedium');
            if(!personalDataMinimumRootEl) return;

            const ratingAndReviewContainer = personalDataMinimumRootEl.querySelector('span[role="img"]');
            const ratingAndReviewContainerSpans = [...ratingAndReviewContainer.querySelectorAll('span')];
            rating = ratingAndReviewContainerSpans[0].textContent;
            const parenthesisRegex = /\(|\)/g;
            reviews = ratingAndReviewContainerSpans[ratingAndReviewContainerSpans.length - 2].textContent.replace(parenthesisRegex, ''); 
    
            const industryAddressPhoneDivsContainer = [...personalDataMinimumRootEl.querySelectorAll(':scope > div')]
            const addressSpans = industryAddressPhoneDivsContainer[3].querySelectorAll('div:first-child > span')
            address = addressSpans[addressSpans.length - 1].querySelector('span:last-child').textContent

            phone = industryAddressPhoneDivsContainer[3].querySelector('div:last-child > span:last-child > span:last-child').textContent

            industry = industryAddressPhoneDivsContainer[3].querySelector('div:first-child > span:first-child > span').textContent

            // company urls
            const allLinks = Array.from(container.querySelectorAll('a[href]'));
            const GOOGLE_MAPS_PLACE_LINK = "https://www.google.com/maps/place/"
            const filteredLinks = allLinks.filter(a => !a.href.startsWith(GOOGLE_MAPS_PLACE_LINK));
            if (filteredLinks.length > 0) {
                web = filteredLinks[0].href;
            }

        }
        
        // Return the data as an object
        return {
            title,
            rating,
            reviews,
            address,
            phone,
            industry,
            web
        };
    });
}



// Convert the table to a CSV string
function tableToCsv(table) {
    var csv = [];
    var rows = table.querySelectorAll('tr');
    
    for (var i = 0; i < rows.length; i++) {
        var row = [], cols = rows[i].querySelectorAll('td, th');
        
        for (var j = 0; j < cols.length; j++) {
            row.push('"' + cols[j].innerText + '"');
        }
        csv.push(row.join(','));
    }
    return csv.join('\n');
}

// Download the CSV file
function downloadCsv(csv, filename) {
    var csvFile;
    var downloadLink;

    csvFile = new Blob([csv], {type: 'text/csv'});
    downloadLink = document.createElement('a');
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
}

