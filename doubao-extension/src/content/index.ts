import { processPrompt } from './core/prompt';

console.log('Doubao Shadow Node: Content Script Loaded');

// Inject the hook script
const hookScript = document.createElement('script');
// Need to use chrome.runtime.getURL for Vite CRX processed assets correctly
hookScript.src = chrome.runtime.getURL('assets/hook.js');
(document.head || document.documentElement).appendChild(hookScript);

let currentRequestId: string | null = null;
let accumulatedResponse = '';
let responseTimeout: number | null = null;

// Listen for messages from the injected hook script
window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'DOUBAO_PROGRESS') {
        if (currentRequestId && chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({
                type: 'PROGRESS',
                requestId: currentRequestId,
                text: event.data.text
            }).catch(() => {});
        }
        return;
    }

    if (event.data.type === 'DOUBAO_CHUNK') {
        const text = event.data.text;
        const images = event.data.images || [];

        accumulatedResponse += text;

        console.log('Received chunk:', { text: text.substring(0, 50), images: images.length });

        // Check if extension context is still valid
        if (!chrome.runtime || !chrome.runtime.id) {
            console.warn('Doubao Shadow Node: Extension context invalidated, ignoring message.');
            return;
        }

        // Send final result when finished
        if (event.data.is_finish || event.data.is_finish === true) {
            console.log('Response finished via Hook:', { text: accumulatedResponse.substring(0, 100), images: images.length });

            if (currentRequestId) {
                if (responseTimeout !== null) {
                    clearTimeout(responseTimeout);
                    responseTimeout = null;
                }
                
                try {
                    chrome.runtime.sendMessage({
                        type: 'RESULT',
                        requestId: currentRequestId,
                        text: accumulatedResponse,
                        images: images
                    });
                } catch (err) {
                    console.error('Failed to send result:', err);
                }
                currentRequestId = null;
                accumulatedResponse = '';
            }
        }
    }
});

chrome.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any) => {
    if (request.type === 'PROMPT') {
        currentRequestId = request.requestId;
        accumulatedResponse = ''; // Reset for new request
        
        processPrompt(
            request.text,
            request.requestId,
            request.isImageMode,
            request.referenceImages || [],
            request.aspectRatio || 'Auto',
            request.switchToImageMode || false
        ).catch(err => {
            console.error('Error processing prompt:', err);
        });
        
        sendResponse({ status: 'processing' });

        // Set timeout
        if (responseTimeout !== null) {
            clearTimeout(responseTimeout);
        }
        // @ts-ignore
        responseTimeout = setTimeout(() => {
            if (currentRequestId === request.requestId) {
                if (accumulatedResponse.length > 0) {
                    chrome.runtime.sendMessage({ type: 'RESULT', requestId: request.requestId, text: accumulatedResponse });
                } else {
                    chrome.runtime.sendMessage({ type: 'RESULT', requestId: request.requestId, text: "Error: Timeout" });
                }
                currentRequestId = null;
            }
        }, 60000);
    }
    return true;
});
