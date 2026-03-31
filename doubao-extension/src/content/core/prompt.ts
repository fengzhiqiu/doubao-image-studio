import { sendTextToInput, clickSendButton, uploadReferenceImages, setAspectRatioOnPage } from '../dom/injector';

export async function processPrompt(
    text: string, 
    requestId: string, 
    isImageMode = false, 
    referenceImages: string[] = [], 
    aspectRatio = 'Auto', 
    switchToImageMode = false
) {
    console.log('Processing prompt:', text, 'Image mode:', isImageMode, 'Switch to image mode:', switchToImageMode);
    console.log('Reference images:', referenceImages.length, 'Aspect ratio:', aspectRatio);

    let finalPrompt = text;
    if (aspectRatio && aspectRatio !== 'Auto' && !text.includes('比例')) {
        finalPrompt = `${text} 比例 ${aspectRatio}`;
    }

    // 1. Find Input Area (now a contenteditable div, not textarea)
    let inputEl = document.querySelector('[data-testid="chat_input_input"]') as HTMLElement
        || document.querySelector('[contenteditable="true"][role="textbox"]') as HTMLElement
        || document.querySelector('#chat-route-layout textarea') as HTMLElement
        || document.querySelector('textarea') as HTMLElement;

    if (!inputEl) {
        console.error('Could not find input element');
        chrome.runtime.sendMessage({ type: 'RESULT', requestId, text: "Error: Could not find chat input on page." });
        return;
    }

    // If image mode, first trigger image generation mode
    if (isImageMode) {
        console.log('Image mode: switchToImageMode=', switchToImageMode);

        const isAlreadyInImageMode = !switchToImageMode ||
            document.querySelector('[data-testid="image-creation-chat-input-picture-reference-button"]') ||
            document.querySelector('[data-testid="image-creation-chat-input-picture-ration-button"]') ||
            document.querySelector('[data-testid="image-creation-chat-input-picture-model-button"]');

        if (isAlreadyInImageMode) {
            console.log('Already in image generation mode (or no switch needed), sending prompt directly');

            const newInputEl = document.querySelector('[data-testid="chat_input_input"]') as HTMLElement
                || document.querySelector('[contenteditable="true"][role="textbox"]') as HTMLElement
                || document.querySelector('div.editor-wrapper-aTMAEc [contenteditable="true"]') as HTMLElement;

            if (newInputEl) {
                console.log('Found input element in image mode');
                newInputEl.click();
                newInputEl.focus();
                await new Promise(r => setTimeout(r, 300));

                if (referenceImages && referenceImages.length > 0) {
                    console.log('Uploading', referenceImages.length, 'reference images...');
                    const uploadSuccess = await uploadReferenceImages(referenceImages);
                    if (!uploadSuccess) {
                        console.error('Failed to upload reference images');
                    }
                    await new Promise(r => setTimeout(r, 500));
                }

                await setAspectRatioOnPage(aspectRatio);

                await sendTextToInput(newInputEl, finalPrompt);
                await clickSendButton();
                return;
            } else {
                console.error('Could not find input element in image mode');
                return;
            }
        }

        // Not in image mode yet, need to switch
        console.log('Not in image generation mode, triggering mode switch...');

        let currentInput = document.querySelector('div.editor-wrapper-aTMAEc textarea') as HTMLElement
            || document.querySelector('#chat-route-layout textarea') as HTMLElement
            || document.querySelector('[data-testid="chat_input_input"]') as HTMLElement
            || document.querySelector('textarea') as HTMLElement;

        if (!currentInput) {
            console.error('Could not find input element');
            return;
        }

        console.log('Found input for command:', currentInput.tagName);

        currentInput.click();
        currentInput.focus();
        await new Promise(r => setTimeout(r, 200));

        await sendTextToInput(currentInput, '/图像');
        await new Promise(r => setTimeout(r, 1500)); // Wait for popup to appear

        console.log('Looking for 图像生成 button in popup...');
        let imageGenButton: HTMLElement | null = null;

        for (let attempt = 0; attempt < 5; attempt++) {
            const allButtons = Array.from(document.querySelectorAll('button'));
            imageGenButton = allButtons.find(btn => {
                const text = btn.textContent?.trim() || '';
                return text === '图像生成' || text.includes('图像生成') || text.includes('图像');
            }) as HTMLElement | null;

            if (imageGenButton) {
                console.log('Found 图像生成 button on attempt', attempt + 1);
                break;
            }

            console.log('Button not found, retrying... (attempt', attempt + 1, ')');
            await new Promise(r => setTimeout(r, 500));
        }

        if (imageGenButton) {
            imageGenButton.click();
            console.log('Clicked 图像生成 button');
            await new Promise(r => setTimeout(r, 1000)); // Wait for mode to activate

            const newInputEl = document.querySelector('[data-testid="chat_input_input"]') as HTMLElement
                || document.querySelector('[contenteditable="true"][role="textbox"]') as HTMLElement
                || document.querySelector('div.editor-wrapper-aTMAEc [contenteditable="true"]') as HTMLElement;

            if (newInputEl) {
                console.log('Found new input element:', newInputEl.tagName, newInputEl.className);

                newInputEl.click();
                newInputEl.focus();
                await new Promise(r => setTimeout(r, 300));

                if (referenceImages && referenceImages.length > 0) {
                    console.log('Uploading', referenceImages.length, 'reference images...');
                    const uploadSuccess = await uploadReferenceImages(referenceImages);
                    if (!uploadSuccess) {
                        console.error('Failed to upload reference images');
                    }
                    await new Promise(r => setTimeout(r, 500));
                }

                await setAspectRatioOnPage(aspectRatio);

                await sendTextToInput(newInputEl, finalPrompt);
                await clickSendButton();
            } else {
                console.error('Could not find input element after clicking image generation button');
                currentInput.click();
                currentInput.focus();
                await sendTextToInput(currentInput, finalPrompt);
                await clickSendButton();
            }
        } else {
            console.error('图像生成 button not found in popup');
            await sendTextToInput(currentInput, '');
        }
        await new Promise(r => setTimeout(r, 2000));
    } else {
        // Normal text mode - 支持参考图
        console.log('Text chat mode');

        if (referenceImages && referenceImages.length > 0) {
            console.log('Text mode with', referenceImages.length, 'reference images');

            inputEl.click();
            inputEl.focus();
            await new Promise(r => setTimeout(r, 300));

            const uploadSuccess = await uploadReferenceImages(referenceImages);
            if (!uploadSuccess) {
                console.error('Failed to upload reference images in text mode');
            }

            await new Promise(r => setTimeout(r, 500));
        }

        await sendTextToInput(inputEl, text);
        await clickSendButton();
    }
}
