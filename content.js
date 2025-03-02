// Function to detect Lightning components
function detectLightningComponents() {
    const components = new Map();
    
    // Common HTML elements to filter out
    const commonHtmlTags = new Set([
        'a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 
        'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 
        'col', 'colgroup', 'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 
        'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 
        'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 
        'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 
        'main', 'map', 'mark', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 
        'optgroup', 'option', 'output', 'p', 'param', 'picture', 'pre', 'progress', 
        'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 
        'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 
        'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 
        'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr'
    ]);

    // Select elements with data-aura-class or data-aura-rendered-by
    const auraElements = document.querySelectorAll('[data-aura-class], [data-aura-rendered-by]');
    
    // Function to check if an element has lightning-* attributes
    function hasLightningAttribute(element) {
        return Array.from(element.attributes).some(attr => 
            attr.name.startsWith('lightning-')
        );
    }

    // Function to check if an element has lwc-* attributes
    function hasLwcAttribute(element) {
        return Array.from(element.attributes).some(attr => 
            attr.name.startsWith('lwc-')
        );
    }

    // Process aura elements
    auraElements.forEach(element => {
        const tagName = element.tagName.toLowerCase();
        const componentName = element.getAttribute('data-aura-class') || tagName || 'Unknown Component';
        const parentId = element.closest('[data-aura-rendered-by]')?.getAttribute('data-aura-rendered-by') || 'root';
        const isLwc = hasLwcAttribute(element); // Check for LWC attributes
        
        // Only include if it's not a common HTML tag or has a specific Lightning attribute
        if (!commonHtmlTags.has(tagName) || element.getAttribute('data-aura-class')) {
            if (!components.has(componentName)) {
                components.set(componentName, {
                    name: componentName,
                    count: 0,
                    instances: [],
                    children: new Set(),
                    isLwc: isLwc || false // Default to false if not LWC
                });
            }
            
            const component = components.get(componentName);
            component.count++;
            component.instances.push({
                id: element.id || `instance-${component.count}`,
                parentId: parentId,
                dataComponentId: element.getAttribute('data-component-id') || null // Add data-component-id
            });
        }
    });

    // Check all elements for lightning-* and lwc-* attributes
    const allElements = document.getElementsByTagName('*');
    Array.from(allElements).forEach(element => {
        const tagName = element.tagName.toLowerCase();
        if ((hasLightningAttribute(element) || hasLwcAttribute(element)) && !element.hasAttribute('data-aura-class')) {
            const componentName = tagName || 'Unknown Component';
            const parentId = element.closest('[data-aura-rendered-by]')?.getAttribute('data-aura-rendered-by') || 'root';
            const isLwc = hasLwcAttribute(element); // Flag for LWC
            
            // Only include if it's not a common HTML tag
            if (!commonHtmlTags.has(tagName)) {
                if (!components.has(componentName)) {
                    components.set(componentName, {
                        name: componentName,
                        count: 0,
                        instances: [],
                        children: new Set(),
                        isLwc: isLwc || false // Default to false if not LWC
                    });
                }
                
                const component = components.get(componentName);
                component.count++;
                component.instances.push({
                    id: element.id || `instance-${component.count}`,
                    parentId: parentId,
                    dataComponentId: element.getAttribute('data-component-id') || null // Add data-component-id
                });
            }
        }
    });

    // Build hierarchy
    components.forEach(comp => {
        comp.instances.forEach(instance => {
            if (instance.parentId !== 'root') {
                components.forEach(parentComp => {
                    if (parentComp.instances.some(pi => pi.id === instance.parentId)) {
                        parentComp.children.add(comp.name);
                    }
                });
            }
        });
    });

    return Array.from(components.values());
}

// Function to receive EPT from popup.js or external script
function handleSalesforceEPT(ept, error) {
    console.log('Received EPT:', ept);
    if (error) {
        console.error('EPT Error:', error);
    }
    // Send EPT to popup.js via chrome.runtime.sendMessage
    chrome.runtime.sendMessage({
        action: 'setEPT',
        ept: ept,
        error: error
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error sending EPT to popup:', chrome.runtime.lastError.message);
        } else if (response && response.success) {
            console.log('EPT sent to popup successfully');
        }
    });
}

// Function to get page performance (full load time)
function getPagePerformance() {
    const timing = performance.getEntriesByType('navigation')[0];
    if (timing) {
        const loadTime = timing.loadEventEnd - timing.startTime;
        return loadTime > 0 ? loadTime : 0;
    }
    return null;
}

// Function to highlight a component on the page
function highlightComponent(componentName) {
    // Remove any existing highlights
    const highlightedElements = document.querySelectorAll('.component-highlight');
    highlightedElements.forEach(el => el.classList.remove('component-highlight'));

    // Find elements with matching data-aura-class or tag name
    const elements = document.querySelectorAll(`[data-aura-class="${componentName}"], ${componentName.toLowerCase()}`);
    elements.forEach(element => {
        element.classList.add('component-highlight');
    });

    // Define highlight style (add to document or use existing styles)
    const style = document.createElement('style');
    style.textContent = `
        .component-highlight {
            outline: 3px solid #ff0000; /* Red border for highlight */
            outline-offset: 2px;
            transition: outline 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}

// Persistent message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getComponents") {
        try {
            const components = detectLightningComponents();
            const perf = getPagePerformance();
            sendResponse({ 
                components: components.map(comp => ({
                    ...comp,
                    isLwc: comp.isLwc || false,
                    instances: comp.instances.map(instance => ({
                        ...instance,
                        dataComponentId: instance.dataComponentId || null
                    }))
                })), 
                perf: perf 
            });
            return true; // Keep channel open for async response
        } catch (error) {
            console.error('Error detecting components:', error);
            sendResponse({ error: error.message });
            return true;
        }
    } else if (request.action === "highlightComponent") {
        highlightComponent(request.componentName);
        sendResponse({ success: true });
        return true;
    } else if (request.action === "setEPT") {
        handleSalesforceEPT(request.ept, request.error);
        sendResponse({ success: true });
        return true;
    }
    return true;
});

// Ensure we listen for the EPT from getEPT.js
window.addEventListener('message', function handler(event) {
    if (event.data && event.data.type === 'GET_SF_EPT') {
        window.removeEventListener('message', handler);
        handleSalesforceEPT(event.data.ept, event.data.error);
    }
}, { once: true });

console.log("Salesforce Lightning Component Analyzer content script loaded");