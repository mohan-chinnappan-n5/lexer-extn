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

    // Process aura elements
    auraElements.forEach(element => {
        const tagName = element.tagName.toLowerCase();
        const componentName = element.getAttribute('data-aura-class') || tagName || 'Unknown Component';
        const parentId = element.closest('[data-aura-rendered-by]')?.getAttribute('data-aura-rendered-by') || 'root';
        
        // Only include if it's not a common HTML tag or has a specific Lightning attribute
        if (!commonHtmlTags.has(tagName) || element.getAttribute('data-aura-class')) {
            if (!components.has(componentName)) {
                components.set(componentName, {
                    name: componentName,
                    count: 0,
                    instances: [],
                    children: new Set()
                });
            }
            
            const component = components.get(componentName);
            component.count++;
            component.instances.push({
                id: element.id || `instance-${component.count}`,
                parentId: parentId
            });
        }
    });

    // Check all elements for lightning-* attributes
    const allElements = document.getElementsByTagName('*');
    Array.from(allElements).forEach(element => {
        const tagName = element.tagName.toLowerCase();
        if (hasLightningAttribute(element) && !element.hasAttribute('data-aura-class')) {
            const componentName = tagName || 'Unknown Component';
            const parentId = element.closest('[data-aura-rendered-by]')?.getAttribute('data-aura-rendered-by') || 'root';
            
            // Only include if it's not a common HTML tag
            if (!commonHtmlTags.has(tagName)) {
                if (!components.has(componentName)) {
                    components.set(componentName, {
                        name: componentName,
                        count: 0,
                        instances: [],
                        children: new Set()
                    });
                }
                
                const component = components.get(componentName);
                component.count++;
                component.instances.push({
                    id: element.id || `instance-${component.count}`,
                    parentId: parentId
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

// Persistent message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getComponents") {
        try {
            const components = detectLightningComponents();
            sendResponse({ components: components });
            getSalesforceEPT((ept, error) => {
                if (error) {
                    console.error('EPT Error:', error);
                }
                console.log('EPT:', ept);
                sendResponse({ components: components, ept: ept });
            });
        } catch (error) {
            console.error('Error detecting components:', error);
            sendResponse({ error: error.message });
        }
    }
    return true; // Keeps the message channel open for async response
});

// Add this new function
function getSalesforceEPT(callback) {
    const script = document.createElement('script');
    script.textContent = `
        (function() {
            try {
                if (window.$A && $A.metricsService && $A.metricsService.getCurrentPageTransaction) {
                    const transaction = $A.metricsService.getCurrentPageTransaction();
                    if (transaction && transaction.config && transaction.config.context && transaction.config.context.ept) {
                        const ept = transaction.config.context.ept;
                        window.postMessage({ type: 'GET_SF_EPT', ept: ept }, '*');
                    } else {
                        window.postMessage({ type: 'GET_SF_EPT', ept: null, error: 'EPT not found' }, '*');
                    }
                } else {
                    window.postMessage({ type: 'GET_SF_EPT', ept: null, error: '$A.metricsService not available' }, '*');
                }
            } catch (e) {
                window.postMessage({ type: 'GET_SF_EPT', ept: null, error: e.message }, '*');
            }
        })();
    `;
    document.head.appendChild(script);
    document.head.removeChild(script);

    window.addEventListener('message', function handler(event) {
        if (event.data.type === 'GET_SF_EPT') {
            window.removeEventListener('message', handler);
            callback(event.data.ept, event.data.error);
        }
    }, { once: true });
}


// Log to confirm content script is running
console.log("Salesforce Lightning Component Analyzer content script loaded");