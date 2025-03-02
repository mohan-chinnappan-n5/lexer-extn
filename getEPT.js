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