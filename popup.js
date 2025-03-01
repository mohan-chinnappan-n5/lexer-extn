document.addEventListener('DOMContentLoaded', () => {
    let eptValue = null; 
    let allComponents = [];
    let sortBy = 'name'; // Default sort by name
    let sortOrder = 'asc'; // Default ascending

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
                            console.log('EPT:', eptValue);

                            // displayComponents(allComponents, '', sortBy, sortOrder);
                            displayComponents(allComponents, '', sortBy, sortBy, eptValue);

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

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        // displayComponents(allComponents, searchTerm, sortBy, sortOrder);
        displayComponents(allComponents, searchTerm, sortBy, sortOrder, eptValue);

    });
});

function displayComponents(components, searchTerm = '', sortBy = 'name', sortOrder = 'asc') {
    const container = document.getElementById('componentList');
    container.innerHTML = '';

    // Filter components based on search term
    const filteredComponents = components.filter(component => 
        component.name.toLowerCase().includes(searchTerm)
    );

    // Sort components
    filteredComponents.sort((a, b) => {
        if (sortBy === 'name') {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        } else if (sortBy === 'count') {
            return sortOrder === 'asc' ? a.count - b.count : b.count - a.count;
        }
        return 0;
    });

    // Calculate counts
    const uniqueCount = components.length;
    const totalCount = components.reduce((sum, comp) => sum + comp.count, 0);
    document.getElementById('uniqueCount').textContent = uniqueCount;
    document.getElementById('totalCount').textContent = totalCount;

    // Add grid header with clickable sort buttons
    const header = document.createElement('div');
    header.className = 'grid grid-cols-2 gap-2 bg-gray-200 p-2 rounded font-semibold text-gray-700';
    header.innerHTML = `
        <div class="cursor-pointer" id="sortName">
            Component Name 
            <span>${sortBy === 'name' ? (sortOrder === 'asc' ? '&uarr;' : '&darr;') : ''}</span>
        </div>
        <div class="text-center cursor-pointer" id="sortCount">
            Count 
            <span>${sortBy === 'count' ? (sortOrder === 'asc' ? '&uarr;' : '&darr;') : ''}</span>
        </div>
    `;
    container.appendChild(header);

    // Add sorting event listeners
    header.querySelector('#sortName').addEventListener('click', () => {
        sortBy = 'name';
        sortOrder = (sortBy === 'name' && sortOrder === 'asc') ? 'desc' : 'asc';
        displayComponents(components, searchTerm, sortBy, sortOrder);
    });
    header.querySelector('#sortCount').addEventListener('click', () => {
        sortBy = 'count';
        sortOrder = (sortBy === 'count' && sortOrder === 'asc') ? 'desc' : 'asc';
        displayComponents(components, searchTerm, sortBy, sortOrder);
    });

    // Add filtered components
    filteredComponents.forEach(component => {
        const div = document.createElement('div');
        div.className = 'grid grid-cols-2 gap-2 bg-white p-2 rounded shadow';
        div.innerHTML = `
            <div>
                <span class="font-bold text-blue-600">${component.name}</span>
                ${component.children.size > 0 ? `
                    <div class="ml-4 text-sm text-gray-600">
                        Children: ${Array.from(component.children).join(', ')}
                    </div>
                ` : ''}
            </div>
            <div class="text-center text-gray-700">${component.count}</div>
        `;
        container.appendChild(div);
    });

    // If no results
    if (filteredComponents.length === 0 && searchTerm) {
        container.innerHTML += '<p class="text-gray-600 text-center">No components match your search.</p>';
    }
}