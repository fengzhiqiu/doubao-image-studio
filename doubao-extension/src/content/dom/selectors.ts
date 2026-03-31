export function findSendButton(): HTMLButtonElement | null {
    // Try multiple selectors
    const selectors = [
        '[data-testid="chat_input_send_button"]', // Specific ID from user
        '#flow-end-msg-send',
        'button[aria-label*="发送"]',
        'button[type="submit"]',
        'button svg[class*="send"]',
        '.send-button'
    ];

    for (const selector of selectors) {
        const btn = document.querySelector(selector) as HTMLButtonElement | null;
        if (btn) return btn;
    }

    // Fallback: find button near textarea
    const buttons = document.querySelectorAll('button');
    for (const btn of Array.from(buttons)) {
        const svg = btn.querySelector('svg');
        if (svg && btn.closest('form, .input-container, [class*="input"]')) {
            return btn as HTMLButtonElement;
        }
    }

    return null;
}
