// @ts-nocheck
console.log('Doubao Shadow Node: Hook Script Injected Successfully');
const originalFetch = window.fetch;

window.fetch = async function (url: string | URL | Request, options?: RequestInit) {
    const response = await originalFetch(url, options);

    // Start standard stream parsing
    if (url && url.toString().includes('chat/completion')) {
        console.log('Doubao Shadow Node: Intercepted chat completion', url);

        const clone = response.clone();
        const reader = clone.body.getReader();
        const decoder = new TextDecoder();

        let accumulatedText = '';
        let images = [];
        let buffer = '';
        let currentEvent = '';

        (async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    const lines = buffer.split('\n');
                    // Keep the last (possibly incomplete) line in buffer
                    buffer = lines.pop();

                    for (const line of lines) {
                        const trimmed = line.trim();

                        // Parse SSE event name line
                        if (trimmed.startsWith('event:')) {
                            currentEvent = trimmed.slice(6).trim();
                            continue;
                        }

                        // Parse SSE data line
                        if (trimmed.startsWith('data:')) {
                            const jsonStr = trimmed.slice(5).trim();
                            if (!jsonStr || jsonStr === '{}') continue;

                            try {
                                const data = JSON.parse(jsonStr);

                                // Handle CHUNK_DELTA — plain text delta
                                if (currentEvent === 'CHUNK_DELTA') {
                                    if (data.text) {
                                        accumulatedText += data.text;
                                        window.postMessage({ type: 'DOUBAO_PROGRESS', text: data.text }, '*');
                                    }
                                    continue;
                                }

                                // Handle STREAM_CHUNK — contains patch_op with content blocks
                                if (currentEvent === 'STREAM_CHUNK') {
                                    const patchOps = data.patch_op || [];
                                    for (const op of patchOps) {
                                        const contentBlocks = op?.patch_value?.content_block || [];
                                        for (const block of contentBlocks) {
                                            // block_type 2074 = image creation block
                                            if (block.block_type === 2074) {
                                                const creations = block.content?.creation_block?.creations || [];
                                                const newImages = [];
                                                for (const creation of creations) {
                                                    if (creation.type === 1 && creation.image && creation.image.status === 2) {
                                                        const imgData = creation.image;
                                                        newImages.push({
                                                            url: imgData.image_ori_raw?.url || imgData.image_ori?.url || '',
                                                            thumbnail_url: imgData.image_thumb?.url || imgData.image_preview?.url || imgData.image_ori_raw?.url || '',
                                                            width: imgData.image_ori_raw?.width || imgData.image_ori?.width || 1024,
                                                            height: imgData.image_ori_raw?.height || imgData.image_ori?.height || 1024
                                                        });
                                                    }
                                                }

                                                if (newImages.length > 0) {
                                                    images = newImages;
                                                    console.log('Doubao Shadow Node: Extracted images:', images.length);
                                                    window.postMessage({ type: 'DOUBAO_PROGRESS', text: `已生成 ${images.length} 张图片，等待完成...` }, '*');
                                                }

                                                // is_finish on image block = all done
                                                if (block.is_finish && images.length > 0) {
                                                    console.log('Doubao Shadow Node: Sending Final Result', {
                                                        text: accumulatedText.substring(0, 50),
                                                        images: images.length
                                                    });
                                                    window.postMessage({
                                                        type: 'DOUBAO_CHUNK',
                                                        text: accumulatedText,
                                                        images: images,
                                                        is_finish: true
                                                    }, '*');
                                                }
                                            }

                                            // block_type 10000 = text block (fallback text extraction)
                                            if (block.block_type === 10000) {
                                                const text = block.content?.text_block?.text;
                                                if (text) {
                                                    accumulatedText += text;
                                                    window.postMessage({ type: 'DOUBAO_PROGRESS', text: text }, '*');
                                                }
                                            }
                                        }
                                    }
                                    continue;
                                }

                                // Handle SSE_REPLY_END (end_type=3 is the final end)
                                if (currentEvent === 'SSE_REPLY_END') {
                                    if (data.end_type === 3 && images.length === 0 && accumulatedText.length > 0) {
                                        // Text-only response (no images), send accumulated text
                                        console.log('Doubao Shadow Node: Text-only reply finished');
                                        window.postMessage({
                                            type: 'DOUBAO_CHUNK',
                                            text: accumulatedText,
                                            images: [],
                                            is_finish: true
                                        }, '*');
                                    }
                                    continue;
                                }

                            } catch (e) {
                                console.log('Parse error for line:', trimmed.substring(0, 100), e);
                            }
                        }

                        // Blank line resets current event
                        if (trimmed === '') {
                            currentEvent = '';
                        }
                    }
                }
            } catch (err) {
                console.error('Doubao Shadow Node: Error reading stream', err);
            }
        })();
    }

    return response;
};
