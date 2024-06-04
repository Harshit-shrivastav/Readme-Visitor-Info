export default {
    async fetch(request, env, ctx) {
        const countKey = 'request_count';
        let count = await env.REQUEST_COUNT.get(countKey);
        count = count ? parseInt(count) : 0;
        count += 1;
        await env.REQUEST_COUNT.put(countKey, count);

        // Execute the remaining functions
        let ipAddress = 'Unknown';
        let city = 'Unknown';
        let region = 'Unknown';
        const currentTime = new Date().toLocaleString();
        const url = new URL(request.url);
        const currentWebAddress = url.searchParams.get('url') || 'Unknown';

        // Get the client's original IP address from the CF-Connecting-IP header
        ipAddress = request.headers.get('CF-Connecting-IP') || 'Unknown';

        // Get secrets from environment variables
        const secretBotToken = env.TELEGRAM_BOT_TOKEN;
        const secretUserId = env.TELEGRAM_USER_ID;

        // Send initial message
        let messageId;
        const initialMessage = `New visitor detected!\nWeb Address: ${currentWebAddress}\nTime: ${currentTime}\nFetching more details...`;
        try {
            messageId = await sendTelegramMessage(secretBotToken, secretUserId, initialMessage);
        } catch (error) {
            console.error('Error sending initial Telegram message:', error);
        }

        // Fetch location based on the client's original IP address
        try {
            const locationResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`);
            if (!locationResponse.ok) throw new Error('Failed to fetch location');
            const locationData = await locationResponse.json();
            city = locationData.city || 'Unknown';
            region = locationData.region || 'Unknown';

            // Update message with IP address and location
            const updatedMessage = `New visitor!\nIP Address: ${ipAddress}\nLocation: ${city}, ${region}\nTime: ${currentTime}\nWeb Address: ${currentWebAddress}`;
            await updateTelegramMessage(secretBotToken, secretUserId, messageId, updatedMessage);
        } catch (error) {
            console.error('Error during notification update:', error);
        }

        // Return the count as the response
        return new Response(count.toString(), {
            headers: { 'Content-Type': 'text/plain' },
        });
    }
};

async function sendTelegramMessage(botToken, userId, message) {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: userId,
            text: message,
        }),
    });
    if (!response.ok) throw new Error('Failed to send Telegram message');
    const data = await response.json();
    return data.result.message_id;
}

async function updateTelegramMessage(botToken, userId, messageId, message) {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: userId,
            message_id: messageId,
            text: message,
        }),
    });
    if (!response.ok) throw new Error('Failed to update Telegram message');
}
