// Chatbot functionality
const chatToggle = document.getElementById('chatToggle');
const chatbotContainer = document.getElementById('chatbotContainer');
const closeChat = document.getElementById('closeChat');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');

// n8n webhook URL
const WEBHOOK_URL = 'https://n8ngc.codeblazar.org/webhook/f330b68b-3b5a-45b8-bb65-952280da2264';

// Toggle chatbot
chatToggle.addEventListener('click', () => {
    chatbotContainer.classList.add('active');
    chatToggle.style.display = 'none';
    userInput.focus();
});

closeChat.addEventListener('click', () => {
    chatbotContainer.classList.remove('active');
    chatToggle.style.display = 'flex';
});

// Send message function
async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    userInput.value = '';
    
    // Disable input while processing
    userInput.disabled = true;
    sendBtn.disabled = true;
    
    // Show typing indicator
    const typingIndicator = addTypingIndicator();
    
    try {
        // Send message to n8n webhook
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                timestamp: new Date().toISOString()
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get response text first
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        // Remove typing indicator
        typingIndicator.remove();
        
        // Try to parse as JSON, but handle plain text responses too
        let botMessage;
        try {
            const data = JSON.parse(responseText);
            console.log('Parsed JSON data:', data);
            // Try different possible response fields
            botMessage = data.response || data.message || data.output || data.text || data.reply || JSON.stringify(data);
        } catch (parseError) {
            console.log('Not JSON, using text response:', parseError);
            // If not JSON, use the text response directly
            botMessage = responseText || "I'm here to support you. Could you tell me more about what's on your mind?";
        }
        
        // Add bot response
        addMessage(botMessage, 'bot');
        
    } catch (error) {
        console.error('Error sending message:', error);
        console.error('Error details:', error.message, error.stack);
        typingIndicator.remove();
        addMessage("I apologize, but I'm having trouble connecting right now. Please try again in a moment. If you're in crisis, please reach out to a mental health professional or emergency services.", 'bot');
    } finally {
        // Re-enable input
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// Add message to chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Convert markdown-style formatting to HTML
    const formattedText = formatMessage(text);
    contentDiv.innerHTML = formattedText;
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

// Format message with basic markdown support
function formatMessage(text) {
    // Escape HTML to prevent XSS
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Convert markdown bold (**text** or __text__) to HTML
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Convert markdown italic (*text* or _text_)
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Convert markdown tables
    if (formatted.includes('|')) {
        formatted = convertMarkdownTable(formatted);
    }
    
    // Wrap in paragraph if no block elements
    if (!formatted.includes('<table') && !formatted.includes('<br>')) {
        formatted = `<p>${formatted}</p>`;
    }
    
    return formatted;
}

// Convert markdown table to HTML table
function convertMarkdownTable(text) {
    const lines = text.split('<br>');
    let result = [];
    let inTable = false;
    let tableRows = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('|') && line.endsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableRows = [];
            }
            tableRows.push(line);
        } else {
            if (inTable && tableRows.length > 0) {
                result.push(buildHtmlTable(tableRows));
                tableRows = [];
                inTable = false;
            }
            if (line) {
                result.push(line);
            }
        }
    }
    
    if (inTable && tableRows.length > 0) {
        result.push(buildHtmlTable(tableRows));
    }
    
    return result.join('<br>');
}

// Build HTML table from markdown rows
function buildHtmlTable(rows) {
    if (rows.length < 2) return rows.join('<br>');
    
    let html = '<table>';
    
    // Header row
    const headerCells = rows[0].split('|').filter(cell => cell.trim());
    html += '<thead><tr>';
    headerCells.forEach(cell => {
        html += `<th>${cell.trim()}</th>`;
    });
    html += '</tr></thead>';
    
    // Body rows (skip separator row at index 1)
    html += '<tbody>';
    for (let i = 2; i < rows.length; i++) {
        const cells = rows[i].split('|').filter(cell => cell.trim());
        html += '<tr>';
        cells.forEach(cell => {
            html += `<td>${cell.trim()}</td>`;
        });
        html += '</tr>';
    }
    html += '</tbody></table>';
    
    return html;
}

// Add typing indicator
function addTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        typingDiv.appendChild(dot);
    }
    
    messageDiv.appendChild(typingDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-resize textarea (optional enhancement)
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});
