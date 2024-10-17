
const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const Message = require("./messages.js"); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);


const PORT = 8000;




mongoose.connect("mongodb://localhost:27017/chatapp", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));


const redis = new Redis();

redis.on("connect", () => {
    console.log("Connected to Redis");
});

redis.on("error", (err) => {
    console.error("Redis connection error:", err);
});


app.use(express.static(path.resolve(__dirname, "./public")));


app.get("/messages", async (req, res) => {
   
        const cachedMessages = await redis.get("messages");
        if (cachedMessages) {
            console.log("Fetching messages from Redis");
            return res.json(JSON.parse(cachedMessages));
        }

        
        const messages = await Message.find().sort({ timestamp: 1 }).lean();
        
        await redis.set("messages", JSON.stringify(messages), "EX", 60);
        console.log("Fetching messages from MongoDB and storing in Redis");
        return res.json(messages);
    
});


io.on("connection", (socket) => {
    console.log("Connection successful:", socket.id);

    
    socket.on("message", async (data) => {
        console.log("Received message data:", data); 

        const { msg } = data; 

        if (!msg) {
            console.error("Invalid message data:", data);
            socket.emit("error", { message: "Invalid message format." });
            return;
        }

        
        const message = new Message({
            content: msg,
            sender: socket.id 
        });

    
            await message.save();
            console.log("Message saved to MongoDB");

            
            await redis.del("messages");
            console.log("Redis cache invalidated");

            
            io.emit("message", {
                content: message.content,
                sender: message.sender,
                timestamp: message.timestamp
            });
        
    });

    
    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);
    });
});

app.get("/", (req, res) => {
    return res.sendFile(path.join(__dirname, "./public/index.html"));  
});


server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
