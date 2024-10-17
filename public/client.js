const input = document.getElementById("messageInput");
const form = document.getElementById("messageForm");
const messageContainer = document.getElementById("messageContainer");
const socket = io();

let userSocketId = null; 
window.onload = () => {
    loadMessagesFromLocalStorage();
    fetchMessagesFromServer();
};


socket.on("connect", () => {
    userSocketId = socket.id;
    console.log("Connected with socket ID:", userSocketId);
});


socket.on("message", (data) => {
    const { content, sender, timestamp } = data;
    
    if (sender !== userSocketId) {
        const messageObj = { content, sender, timestamp };
        displayMessage(messageObj, 'received');
        storeMessage(messageObj);
    }
});

socket.on("error", (data) => {
    alert(data.message); 
});


form.addEventListener("submit", (e) => {
    e.preventDefault(); 

    const msg = input.value.trim();
    if (msg === "") return;

    
    socket.emit("message", { msg });

    
    const messageObj = {
        content: msg,
        sender: userSocketId, 
        timestamp: new Date()
    };

    
    displayMessage(messageObj, 'sent');

    storeMessage(messageObj);

   
    input.value = "";
});


function displayMessage(message, type) {
    const p = document.createElement("p");
    const time = new Date(message.timestamp).toLocaleTimeString();
    p.innerText = `${message.sender === userSocketId ? 'You' : 'User ' + message.sender} (${time}): ${message.content}`;
    p.classList.add(type);
    messageContainer.appendChild(p);
    messageContainer.scrollTop = messageContainer.scrollHeight; 
}


function storeMessage(message) {
    let messages = JSON.parse(localStorage.getItem('messages')) || [];
    messages.push(message);
    localStorage.setItem('messages', JSON.stringify(messages));
}


function loadMessagesFromLocalStorage() {
    const storedMessages = JSON.parse(localStorage.getItem('messages')) || [];
    messageContainer.innerHTML = ""; 
    storedMessages.forEach(message => {
        const type = message.sender === userSocketId ? 'sent' : 'received';
        displayMessage(message, type);
    });
}


async function fetchMessagesFromServer() {
    try {
        const response = await fetch("/messages");
        const messages = await response.json();
        messages.forEach(message => {
            
            if (!isMessageStored(message)) {
                const type = message.sender === userSocketId ? 'sent' : 'received';
                displayMessage(message, type);
                storeMessage(message);
            }
        });
    } catch (err) {
        console.error("Error fetching messages:", err);
    }
}


function isMessageStored(message) {
    const messages = JSON.parse(localStorage.getItem('messages')) || [];
    return messages.some(storedMsg => 
        storedMsg.content === message.content && 
        storedMsg.sender === message.sender && 
        new Date(storedMsg.timestamp).getTime() === new Date(message.timestamp).getTime()
    );
}
function clearChat() {
    localStorage.clear();
    messageContainer.innerHTML = "";
}

const clearBtn = document.getElementById("clearBtn");
clearBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear the chat history?")) {
        clearChat();
    }
});