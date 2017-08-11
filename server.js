const express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    server = require('http').createServer(app),
    mongoose = require("mongoose"),
    io = require("socket.io").listen(server);
let usernames = {};
const port = process.env.PORT || 8080;

server.listen(port);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use("/jsjquery", express.static(__dirname + "/node_modules/jquery/dist/"));
app.use("/css", express.static(__dirname + "/node_modules/bootstrap/dist/css/"));
app.use("/js", express.static(__dirname + "/node_modules/bootstrap/dist/js/"));
app.use("/simplepeer", express.static(__dirname + "/node_modules/simple-peer/"));
app.use("/libraries", express.static(__dirname + "/libraries/"));
app.use("/socket.io", express.static(__dirname + "/node_modules/socket.io/socket.io-client/dist/"));
app.use("/index", express.static(__dirname + "/"))

app.get('/', (req, res, next) => {
    res.sendFile(__dirname + "/index.html");
});

app.post('/sketch', (req, res, next) => {
    res.sendFile(__dirname + "/sketch.html");
});

app.post('/video', (req, res, next) => {
    res.sendFile(__dirname + "/video.html");
});

app.use(function (req, res) {
    res.send('<br><br><br><center><h2>You are in the wrong place!</h2><br><a href = "/">Go home</a></center>');
});

// Connection to mongoDB ...
// For local run use "mongodb://localhost/chat" ...mongodb://chatmessages:Mzekerom99@ds117271.mlab.com:17271/messages
mongoose.connect("mongodb://chatmessages:Mzekerom99@ds117271.mlab.com:17271/messages", (error) => {
    if (error) console.log(error)
    else console.log("Success Vayo :D ");
});

// creating Schema ...
const chatSchema = new mongoose.Schema({
    username: { type: String, required: true },
    message: { type: String, required: true },
    created: { type: Date, default: Date.now }
});

// Creating a mongoose model for interaction with database ...
const ChatModel = mongoose.model("Message", chatSchema);

// Socketing ...
io.sockets.on("connection", (socket) => {
    let query = ChatModel.find({});
    query.sort("-created").limit(100).exec((error, data) => {
        if (error) throw error;
        else {
            socket.emit("oldMessages", data);
        }
    });
    socket.on("username", (name, callback) => {
        if (name in usernames) {
            callback(false);
        } else {
            callback(true);
            socket.username = name;
            usernames[socket.username] = socket;
            io.emit("usernames", Object.keys(usernames));
        }
    });
    socket.on("message", (message, callback) => {
        message = message.trim();
        // Whisper code below ...
        if (message.substring(0, 3) === "/w ") {
            message = message.substring(3);
            let indexSpace = message.indexOf(" ");
            if (indexSpace !== -1) {
                let name = message.substring(0, indexSpace);
                message = message.substring(indexSpace + 1);
                if (name in usernames) {
                    usernames[name].emit("whisper", { message: message, name: socket.username });
                } else {
                    callback("Enter a valid user !!!");
                }
            } else {
                callback("Please, enter the whisper message");
            }
        } else {
            callback(true);
            let newMessage = new ChatModel({ username: socket.username, message: message });
            newMessage.save((error) => {
                if (error) throw error;
                io.emit("message", { message: message, name: socket.username });
            });
        }
    });

    // For sketch happening ...
    socket.on("Mouse", (messageData) => {
        io.emit("Mouse", messageData);
    });

    socket.on("disconnect", (value) => {
        if (!socket.username)
            return;
        delete usernames[socket.username];
        io.emit("usernames", Object.keys(usernames));
    });
});