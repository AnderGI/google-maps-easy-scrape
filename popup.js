document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var currentTab = tabs[0];
        var actionButton = document.getElementById('actionButton');
        var downloadCsvButton = document.getElementById('downloadCsvButton');
        var resultsTable = document.getElementById('resultsTable');
        var filenameInput = document.getElementById('filenameInput');

        if (currentTab && currentTab.url.includes("://www.google.com/maps/search")) {
            document.getElementById('message').textContent = "Let's scrape Google Maps!";
            actionButton.disabled = false;
            actionButton.classList.add('enabled');
        } else {
            var messageElement = document.getElementById('message');
            messageElement.innerHTML = '';
            var linkElement = document.createElement('a');
            linkElement.href = 'https://www.google.com/maps/search/';
            linkElement.textContent = "Go to Google Maps Search.";
            linkElement.target = '_blank'; 
            messageElement.appendChild(linkElement);

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
                const headers = ['title', 'rating', 'reviews', 'industry', 'address', 'phone', 'web'];
                const headerRow = document.createElement('tr');
                headers.forEach(headerText => {
                    const header = document.createElement('th');
                    header.textContent = headerText;
                    headerRow.appendChild(header);
                });
                resultsTable.appendChild(headerRow);

                // Add new results to the table
                if (!results || !results[0] || !results[0].result) return;
                results[0].result.forEach(function(item) {
                    var row = document.createElement('tr');
                    headers.forEach(function(key) {
                        var cell = document.createElement('td');
                        
                        if (key === 'reviewCount' && item[key]) {
                            item[key] = item[key].replace(/\(|\)/g, ''); 
                        }
                        
                        cell.textContent = item[key] || ''; 
                        row.appendChild(cell);
                    });
                    resultsTable.appendChild(row);
                });

                if (results && results[0] && results[0].result && results[0].result.length > 0) {
                    downloadCsvButton.disabled = false;
                }
            });
        });

        downloadCsvButton.addEventListener('click', function() {
            var csv = tableToCsv(resultsTable); 
            var filename = filenameInput.value.trim();
            if (!filename) {
                filename = 'google-maps-data.csv'; 
            } else {
                filename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.csv';
            }
            downloadCsv(csv, filename); 
        });

    });
});


function scrapeData() {

    let title = ''
    let rating = ''
    let reviews = ''
    let industry = ''
    let address = ''
    let phone = ''
    let web = ''
    const personalDataContainer = Array.from(document.querySelectorAll('div.UaQhfb.fontBodyMedium'))

    return personalDataContainer.map(element => {
        const titleDiv = element.querySelector(':scope > div:first-child')
        title = titleDiv.querySelector('.fontHeadlineSmall').textContent ?? '';
        const ratingAndReviewsDiv = element.querySelector(':scope > div:nth-child(3)')
        const ratingAndReviewsData = ratingAndReviewsDiv.querySelector('span.e4rVHe.fontBodyMedium > span[role="img"]') 
        // console.log(ratingAndReviewsData)
        if(ratingAndReviewsData){
            const text = ratingAndReviewsData.ariaLabel.split(' ')
            rating = text[0]
            reviews = text[2]
        }
        const addressIndustryPhoneDiv = element.querySelector(':scope > div:last-child')
        // console.log(titleDiv)
        // console.log(ratingAndReviewsDiv)
        industry = addressIndustryPhoneDiv.querySelector(':scope > div:first-child > span > span').textContent

        address = addressIndustryPhoneDiv.querySelector(':scope > div:first-child > span:last-child > span:last-child').textContent
        // console.log(addressIndustryPhoneDiv)

        phone = addressIndustryPhoneDiv.querySelector(':scope > div:last-child > span:last-child > span:last-child').textContent

        const linkParent = element.parentNode.parentNode.parentNode.parentNode.querySelector(':scope > div:nth-child(2)');
        var allLinks = Array.from(linkParent.querySelectorAll('a[href]'));
        var filteredLinks = allLinks.filter(a => !a.href.startsWith("https://www.google.com/maps/place/"));
        if (filteredLinks.length > 0) {
            web = filteredLinks[0].href;
        }
       


        return {
            title,
            rating,
            reviews,
            industry,
            address,
            phone,
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