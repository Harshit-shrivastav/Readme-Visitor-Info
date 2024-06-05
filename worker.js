export default {
    async fetch(request, env, ctx) {
        const countKey = 'request_count';
        
        // Fetch the current count from the storage
        let count = await env.REQUEST_COUNT.get(countKey);
        count = count ? parseInt(count) : 0;
        
        // Increment the count by 1
        count += 1;
        await env.REQUEST_COUNT.put(countKey, count.toString());

        // Extract IP address from headers
        const ipAddress = request.headers.get('CF-Connecting-IP') || 'Unknown';
        
        // Parse the URL to extract the web address
        const url = new URL(request.url);
        const currentWebAddress = url.searchParams.get('url') || 'Unknown';

        // Get the current time
        const currentTime = new Date().toLocaleString();

        // Prepare to send a Telegram message
        const secretBotToken = env.TELEGRAM_BOT_TOKEN;
        const secretUserId = env.TELEGRAM_USER_ID;

        let messageId;
        const initialMessage = `New visitor detected!\nWeb Address: ${currentWebAddress}\nTime: ${currentTime}\nFetching more details...`;

        try {
            // Send initial message to Telegram
            messageId = await sendTelegramMessage(secretBotToken, secretUserId, initialMessage);
        } catch (error) {
            console.error('Error sending initial Telegram message:', error);
        }

        try {
            // Fetch location data using the IP address
            const locationResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`);
            if (!locationResponse.ok) throw new Error('Failed to fetch location');
            
            const locationData = await locationResponse.json();
            const city = locationData.city || 'Unknown';
            const region = locationData.region || 'Unknown';

            // Update the initial message with location details
            const updatedMessage = `New visitor!\nIP Address: ${ipAddress}\nLocation: ${city}, ${region}\nTime: ${currentTime}\nWeb Address: ${currentWebAddress}`;
            await updateTelegramMessage(secretBotToken, secretUserId, messageId, updatedMessage);
        } catch (error) {
            console.error('Error during notification update:', error);
        }

        // Return the current count as the response
        return new Response(count.toString(), {
            headers: { 'Content-Type': 'text/plain' },
        });
    }
};

// Function to send a Telegram message
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

// Function to update a Telegram message
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
    
    const data = await response.json();
    return data;
        }
