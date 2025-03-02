document.addEventListener('DOMContentLoaded', () => {
    let allComponents = [];
    let sortBy = 'name';
    let sortOrder = 'asc';
    let eptValue = null;
    let perfValue = null;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) {
            document.getElementById('componentList').innerHTML = 'No active tab found.';
            return;
        }

        if (tab.url.includes('.force.com') || tab.url.includes('.salesforce.com')) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    document.getElementById('componentList').innerHTML = 
                        'Error injecting content script: ' + chrome.runtime.lastError.message;
                    return;
                }

                chrome.tabs.sendMessage(tab.id, { action: "getComponents" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError.message);
                        document.getElementById('componentList').innerHTML = 
                            'Error: ' + chrome.runtime.lastError.message;
                        return;
                    }

                    if (response) {
                        if (response.error) {
                            document.getElementById('componentList').innerHTML = 
                                'Error: ' + response.error;
                        } else if (response.components) {
                            allComponents = response.components;
                            eptValue = response.ept;
                            perfValue = response.perf;
                            console.log('EPT:', eptValue);
                            console.log('Perf:', perfValue);
                            displayComponents(allComponents, '', sortBy, sortOrder, eptValue, perfValue);
                        } else {
                            document.getElementById('componentList').innerHTML = 
                                'No Lightning components found.';
                        }
                    } else {
                        document.getElementById('componentList').innerHTML = 
                            'No response received. Page might not be fully loaded.';
                    }
                });
            });
        } else {
            document.getElementById('componentList').innerHTML = 
                'Please navigate to a Salesforce page.';
        }
    });

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        displayComponents(allComponents, searchTerm, sortBy, sortOrder, eptValue, perfValue);
    });
});

function displayComponents(components, searchTerm = '', sortBy = 'name', sortOrder = 'asc', ept = null, perf = null) {
    const container = document.getElementById('componentList');
    container.innerHTML = '';

    const filteredComponents = components.filter(component => 
        component.name.toLowerCase().includes(searchTerm)
    );

    filteredComponents.sort((a, b) => {
        if (sortBy === 'name') {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        } else if (sortBy === 'id') {
            const idA = a.instances[0]?.id || '';
            const idB = b.instances[0]?.id || '';
            return sortOrder === 'asc' ? idA.localeCompare(idB) : idB.localeCompare(idA);
        } else if (sortBy === 'dataComponentId') {
            const dataIdA = a.instances[0]?.dataComponentId || '';
            const dataIdB = b.instances[0]?.dataComponentId || '';
            return sortOrder === 'asc' ? dataIdA.localeCompare(dataIdB) : dataIdB.localeCompare(dataIdA);
        } else if (sortBy === 'count') {
            return sortOrder === 'asc' ? a.count - b.count : b.count - a.count;
        }
        return 0;
    });

    document.getElementById('uniqueCount').textContent = components.length;
    document.getElementById('totalCount').textContent = components.reduce((sum, comp) => sum + comp.count, 0);
    document.getElementById('eptValue').textContent = ept !== null && !isNaN(ept) ? ept.toFixed(2) : 'N/A';
    document.getElementById('perfValue').textContent = perf !== null && !isNaN(perf) ? perf.toFixed(2) : 'N/A';

    // Header with sort indicators
    const header = document.createElement('div');
    header.className = 'grid grid-cols-4 gap-2 bg-gray-200 p-3 rounded-lg font-semibold text-gray-700 cursor-pointer';
    header.innerHTML = `
        <div id="sortName">Component Name <span class="inline-block ml-1">${sortBy === 'name' ? (sortOrder === 'asc' ? '&uarr;' : '&darr;') : ''}</span></div>
        <div id="sortId" class="text-center">Id <span class="inline-block">${sortBy === 'id' ? (sortOrder === 'asc' ? '&uarr;' : '&darr;') : ''}</span></div>
        <div id="sortDataComponentId" class="text-center">Data Component Id <span class="inline-block">${sortBy === 'dataComponentId' ? (sortOrder === 'asc' ? '&uarr;' : '&darr;') : ''}</span></div>
        <div id="sortCount" class="text-center">Count <span class="inline-block">${sortBy === 'count' ? (sortOrder === 'asc' ? '&uarr;' : '&darr;') : ''}</span></div>
    `;
    container.appendChild(header);

    // Add sorting event listeners
    header.querySelector('#sortName').addEventListener('click', () => {
        sortBy = 'name';
        sortOrder = (sortBy === 'name' && sortOrder === 'asc') ? 'desc' : 'asc';
        displayComponents(components, searchTerm, sortBy, sortOrder, ept, perf);
    });
    header.querySelector('#sortId').addEventListener('click', () => {
        sortBy = 'id';
        sortOrder = (sortBy === 'id' && sortOrder === 'asc') ? 'desc' : 'asc';
        displayComponents(components, searchTerm, sortBy, sortOrder, ept, perf);
    });
    header.querySelector('#sortDataComponentId').addEventListener('click', () => {
        sortBy = 'dataComponentId';
        sortOrder = (sortBy === 'dataComponentId' && sortOrder === 'asc') ? 'desc' : 'asc';
        displayComponents(components, searchTerm, sortBy, sortOrder, ept, perf);
    });
    header.querySelector('#sortCount').addEventListener('click', () => {
        sortBy = 'count';
        sortOrder = (sortBy === 'count' && sortOrder === 'asc') ? 'desc' : 'asc';
        displayComponents(components, searchTerm, sortBy, sortOrder, ept, perf);
    });

    // Add filtered components with LWC highlight
    filteredComponents.forEach(component => {
        const div = document.createElement('div');
        div.className = 'grid grid-cols-4 gap-2 bg-white p-3 rounded-lg shadow-md hover:bg-gray-50 transition-colors';
        div.innerHTML = `
            <div class="truncate">
                <span class="font-bold ${component.isLwc ? 'text-green-600' : 'text-blue-600'} cursor-pointer" data-component="${component.name}">${component.name}</span>
                ${typeof component.isLwc !== 'undefined' && component.isLwc ? '<span class="ml-2 inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">LWC</span>' : ''}
                ${component.children.size > 0 ? `
                    <div class="ml-2 text-sm text-gray-600">
                        Children: ${Array.from(component.children).join(', ')}
                    </div>
                ` : ''}
            </div>
            <div class="text-center text-gray-700 truncate">${component.instances[0]?.id || 'N/A'}</div>
            <div class="text-center text-gray-700 truncate">${component.instances[0]?.dataComponentId || 'N/A'}</div>
            <div class="text-center text-gray-700">${component.count}</div>
        `;
        container.appendChild(div);
    });

    // Add click event listener for component names after adding components
    const componentNames = container.querySelectorAll('.font-bold.text-blue-600, .font-bold.text-green-600');
    componentNames.forEach(name => {
        name.addEventListener('click', () => {
            const componentName = name.getAttribute('data-component');
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: "highlightComponent", componentName: componentName }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error highlighting component:', chrome.runtime.lastError.message);
                    }
                });
            });
        });
    });

    // If no results
    if (filteredComponents.length === 0 && searchTerm) {
        container.innerHTML += '<p class="text-gray-600 text-center py-2">No components match your search.</p>';
    }
}