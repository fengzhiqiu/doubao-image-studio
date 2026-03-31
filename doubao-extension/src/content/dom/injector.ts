import { findSendButton } from './selectors';

export async function sendTextToInput(inputEl: HTMLElement, text: string) {
    // Check if it's a contenteditable element or textarea
    if (inputEl.contentEditable === 'true') {
        // For contenteditable div
        inputEl.textContent = text;

        // Trigger multiple events to ensure Doubao detects the input
        inputEl.dispatchEvent(new Event('focus', { bubbles: true }));
        inputEl.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: text[0] || 'a' }));
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: text[0] || 'a' }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));

        // Also trigger composition events (for Chinese input)
        inputEl.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        inputEl.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: text }));
        inputEl.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));
    } else {
        // For textarea
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        if (nativeTextAreaValueSetter) {
            nativeTextAreaValueSetter.call(inputEl, text);
        } else {
            (inputEl as HTMLTextAreaElement).value = text;
        }
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await new Promise(r => setTimeout(r, 300));
}

export async function clickSendButton() {
    const sendBtn = findSendButton();

    if (sendBtn) {
        console.log('Found send button');

        // Check if button is disabled using multiple methods
        const checkDisabled = () => {
            return sendBtn.disabled ||
                sendBtn.hasAttribute('disabled') ||
                sendBtn.getAttribute('aria-disabled') === 'true' ||
                sendBtn.classList.contains('disabled');
        };

        let isDisabled = checkDisabled();

        if (isDisabled) {
            console.log('Send button is disabled, waiting for it to be enabled...');
            console.log('(This is normal when uploading reference images)');

            // Wait up to 2 minutes for the button to be enabled
            // This handles image upload completion (supports multiple large images)
            let waitTime = 0;
            const maxWaitTime = 120000; // 2 minutes (120 seconds)
            const checkInterval = 500; // Check every 500ms

            while (waitTime < maxWaitTime) {
                await new Promise(r => setTimeout(r, checkInterval));
                waitTime += checkInterval;

                isDisabled = checkDisabled();

                if (!isDisabled) {
                    console.log('Send button is now enabled after', waitTime / 1000, 'seconds');
                    break;
                }

                // Log progress every 5 seconds
                if (waitTime % 5000 === 0) {
                    console.log('Still waiting for button... (' + (waitTime / 1000) + 's)');
                }

                // Optimization: Re-trigger input events every 2 seconds to ensure UI detects changes
                if (waitTime % 2000 === 0) {
                    const inputEl = document.querySelector('[data-testid="chat_input_input"]')
                        || document.querySelector('[contenteditable="true"][role="textbox"]')
                        || document.querySelector('div.editor-wrapper-aTMAEc [contenteditable="true"]');

                    if (inputEl) {
                        console.log('Re-triggering input event to wake up UI...');
                        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            }

            if (isDisabled) {
                console.error('Send button is still disabled after waiting 2 minutes');
                console.log('Attempting to click anyway...');
            }
        } else {
            console.log('Send button is enabled, clicking now');
        }

        sendBtn.click();
    } else {
        console.log('Send button not found, trying Enter key');
        const inputEl = document.querySelector('[data-testid="chat_input_input"]') || document.querySelector('textarea');
        if (inputEl) {
            inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true } as any));
        }
    }

    await new Promise(r => setTimeout(r, 300));
}

/**
 * Upload reference images to Doubao
 */
export async function uploadReferenceImages(referenceImages: string[]): Promise<boolean> {
    try {
        console.log('Starting reference image upload...');

        const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;

        if (fileInputs.length === 0) {
            console.error('No file input found for reference images');
            return false;
        }

        console.log('Found', fileInputs.length, 'file input elements');

        const files: File[] = [];
        for (let i = 0; i < referenceImages.length; i++) {
            const base64Data = referenceImages[i];

            const base64Content = base64Data.includes(',')
                ? base64Data.split(',')[1]
                : base64Data;

            let mimeType = 'image/png';
            if (base64Data.startsWith('data:')) {
                const match = base64Data.match(/data:([^;]+);/);
                if (match) {
                    mimeType = match[1];
                }
            }

            try {
                const byteCharacters = atob(base64Content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let j = 0; j < byteCharacters.length; j++) {
                    byteNumbers[j] = byteCharacters.charCodeAt(j);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: mimeType });

                const extension = mimeType.split('/')[1];
                const file = new File([blob], `reference_${i + 1}.${extension}`, { type: mimeType });
                files.push(file);
            } catch (innerError) {
                console.error(`Error processing image ${i}:`, innerError);
                throw innerError;
            }
        }

        console.log('Converted', files.length, 'base64 images to File objects');

        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));

        const fileInput = fileInputs[0];
        fileInput.files = dataTransfer.files;

        fileInput.dispatchEvent(new Event('input', { bubbles: true }));
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('Triggered file upload for', files.length, 'reference images');

        await new Promise(r => setTimeout(r, 1000));

        console.log('Reference images upload initiated');
        return true;

    } catch (error) {
        console.error('Error uploading reference images:', error);
        return false;
    }
}

const ASPECT_RATIO_LABEL_MAP: Record<string, string> = {
    '1:1': '1:1',
    '16:9': '16:9',
    '9:16': '9:16',
    '4:3': '4:3',
    '3:4': '3:4',
};

export async function setAspectRatioOnPage(aspectRatio: string) {
    if (!aspectRatio || aspectRatio === 'Auto') return;

    const targetLabel = ASPECT_RATIO_LABEL_MAP[aspectRatio];
    if (!targetLabel) return;

    let rationBtn = document.querySelector('[data-testid="image-creation-chat-input-picture-ration-button"]') as HTMLElement
        || document.querySelector('button[aria-label*="比例"]') as HTMLElement
        || Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('比例'));
        
    if (!rationBtn) {
        console.log('Ratio button not found, skipping aspect ratio selection');
        return;
    }

    rationBtn.click();
    console.log('Clicked ratio button, waiting for picker...');
    await new Promise(r => setTimeout(r, 500));

    const allButtons = Array.from(document.querySelectorAll('button, [role="option"], [role="menuitem"]'));
    const targetBtn = allButtons.find(btn => {
        const text = btn.textContent?.trim() || '';
        return text === targetLabel || text.includes(targetLabel);
    }) as HTMLElement;

    if (targetBtn) {
        targetBtn.click();
        console.log('Set aspect ratio to:', targetLabel);
        await new Promise(r => setTimeout(r, 300));
    } else {
        console.log('Ratio option not found for:', targetLabel, '- closing picker');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await new Promise(r => setTimeout(r, 200));
    }
}
