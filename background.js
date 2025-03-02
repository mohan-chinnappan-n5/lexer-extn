// background.js
chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes('.force.com') || tab.url.includes('.salesforce.com')) {
        chrome.tabs.create({
            url: chrome.runtime.getURL('popup.html'),
            active: true
        });
    } else {
        chrome.tabs.create({
            url: chrome.runtime.getURL('popup.html'),
            active: true
        });
    }
});