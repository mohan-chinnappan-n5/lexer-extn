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
            attr.name.startsWith('lightning-') // Check if attribute name starts with 'lightning-'
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
        // Get the component ID or use 'root' if not found
        const componentId = element.getAttribute('data-aura-rendered-by') || 'root';
        const parentId = element.closest('[data-aura-rendered-by]')?.getAttribute('data-aura-rendered-by') || 'root';
        
        // Only include if it's not a common HTML tag or has a specific Lightning attribute
        if (!commonHtmlTags.has(tagName) || element.getAttribute('data-aura-class')) { // Check if it's not a common HTML tag
            if (!components.has(componentName)) { // Check if the component is already in the map
                components.set(componentName, { // Add the component to the map
                    name: componentName,
                    count: 0,
                    instances: [],
                    id: componentId,
                    children: new Set()
                });
            }
            
            const component = components.get(componentName); // Get the component from the map
            component.count++; // Increment the component count
            component.instances.push({ // Add the instance to the component
                id: element.id || `instance-${component.count}`,
                parentId: parentId
            });
        }
    });

    // Check all elements for lightning-* attributes
    const allElements = document.getElementsByTagName('*'); // Get all elements in the document
    Array.from(allElements).forEach(element => {
        const tagName = element.tagName.toLowerCase();
        if ((hasLightningAttribute(element) || hasLwcAttribute(element)) && !element.hasAttribute('data-aura-class')) {

            const componentName = tagName || 'Unknown Component';
            const parentId = element.closest('[data-aura-rendered-by]')?.getAttribute('data-aura-rendered-by') || 'root';
            
            // Only include if it's not a common HTML tag
            if (!commonHtmlTags.has(tagName)) {
                if (!components.has(componentName)) {
                    components.set(componentName, {
                        name: componentName,
                        count: 0,
                        instances: [],
                        children: new Set(),
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

// Persistent message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { // Add a listener for messages from the popup
    if (request.action === "getComponents") { // Check if the action is to get components
        try {
            const components = detectLightningComponents(); // Detect Lightning components
            sendResponse({ components: components }); // Send the components back to the popup
            const perf = getPagePerformance();
            console.log('Page load time:', perf);
            getSalesforceEPT((ept, error) => { // Get the EPT value
                if (error) {
                    console.error('EPT Error:', error);
                }
                console.log('EPT:', ept);
                // sendResponse({ components: components, ept: ept, perf: perf }); //
                sendResponse({ 
                                       components: components.map(comp => ({
                                           ...comp,
                                           instances: comp.instances.map(instance => ({
                                               ...instance,
                                               dataComponentId: instance.dataComponentId || null
                                           }))
                                       })), 
                                       ept: ept, 
                                       perf: perf 
                                   });


            });
        } catch (error) {
            console.error('Error detecting components:', error);
            sendResponse({ error: error.message });
        }
    }
    return true; // Keeps the message channel open for async response
});

// Function to get page performance (full load time)
function getPagePerformance() {
    const timing = performance.getEntriesByType('navigation')[0]; // Get the navigation timing entry
    if (timing) {
        const loadTime = timing.loadEventEnd - timing.startTime;
        return loadTime > 0 ? loadTime : 0;
    }
    return null;
}


// Function to get Salesforce EPT
function getSalesforceEPT(callback) {
    const script = document.createElement('script');
    script.textContent = `
        (function() {
            try {
                if (window.$A && $A.metricsService && $A.metricsService.getCurrentPageTransaction) {
                    const transaction = $A.metricsService.getCurrentPageTransaction();
                    if (transaction && transaction.config && transaction.config.context && transaction.config.context.ept) {
                        const ept = transaction.config.context.ept;
                        window.postMessage({ type: 'GET_SF_EPT', ept: ept }, '*'); // Send EPT value to content script
                    } else {
                        window.postMessage({ type: 'GET_SF_EPT', ept: null, error: 'EPT not found' }, '*'); 
                    }
                } else {
                    // Send an error message if $A.metricsService is not available
                    window.postMessage({ type: 'GET_SF_EPT', ept: null, error: '$A.metricsService not available' }, '*'); 
                }
            } catch (e) {
                window.postMessage({ type: 'GET_SF_EPT', ept: null, error: e.message }, '*');
            }
        })();
    `;
    // Inject the script into the page
    document.head.appendChild(script);
    // Remove the script after execution
    document.head.removeChild(script);

   // Add a listener for the EPT value
    window.addEventListener('message', function handler(event) {
        if (event.data.type === 'GET_SF_EPT') {
            window.removeEventListener('message', handler);
            callback(event.data.ept, event.data.error);
        }
    }, { once: true });
}


// Log to confirm content script is running
console.log("Salesforce Lightning Component Analyzer content script loaded");