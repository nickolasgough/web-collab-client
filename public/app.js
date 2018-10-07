// Global variables

var chalkboard = null;
var context = null;
var client = null;
var currentPoints = [];

var firestore = null;
var database = null;

var user;
var chalkId = 0;
var chalkIds = [];

var isTracing = false;

var chalkStyle = null;
const boardStyle = "black";

var chalkBoardCollection = null;
var userCollection = null;

// Application functions

function initialLoad() {
    chalkboard = document.getElementById("chalkboard");
    context = chalkboard.getContext("2d");

    // firestore = firebase.firestore();
    database = firebase.database();

    // firestoreChalkboardListener();
    databaseChalkboardListener();
}

function login() {
    user = document.getElementById("user").value;
    chalkStyle = document.getElementById("colour").value;

    // firestoreUserListener();
    databaseUserListener();
}

function setTrace(newTrace, event) {
    if (!user || !chalkStyle) {
        window.alert("Please enter a username and colour to begin drawing.");
        return;
    }

    isTracing = newTrace;
    client = chalkboard.getBoundingClientRect();
    const mouseX = event.clientX - client.left;
    const mouseY = event.clientY - client.top;
    currentPoints.push({x: mouseX, y: mouseY});

    if (!isTracing) {
        chalkId += 1;
        currentPoints = [];
    }
}

function traceBoard(event) {
    if (user) {
        // firestoreUploadUser(user, event.clientX, event.clientY);
        databaseUploadUser(user, event.clientX, event.clientY);
    }
    if (!isTracing) {
        return;
    }

    client = chalkboard.getBoundingClientRect();
    const mouseX = event.clientX - client.left;
    const mouseY = event.clientY - client.top;
    currentPoints.push({x: mouseX, y: mouseY});

    // firestoreUploadChalk(currentPoints, chalkStyle);
    databaseUploadChalk(currentPoints, chalkStyle);
}

function drawChalk(points, colour) {
    var n = 0;
    var cPoint = null;
    var nPoint = null;
    do {
        cPoint = points[n];
        nPoint = points[n+1];
        drawLine(cPoint, nPoint, colour);

        n += 1;
    } while (n < points.length - 2);
}

function drawLine(source, destination, colour) {
    const strokeStyle = context.strokeStyle;
    context.strokeStyle = colour;

    context.beginPath();
    context.moveTo(source.x, source.y);
    context.lineTo(destination.x, destination.y);
    context.stroke();
    context.closePath();

    context.strokeStyle = strokeStyle;
}

function clearBoard() {
    const fillStyle = context.fillStyle;
    context.fillStyle = boardStyle;
    context.fillRect(0, 0, chalkboard.width, chalkboard.height);
    context.fillStyle = fillStyle;
}

function drawUser(userId, position, colour) {
    var userPointer = document.getElementById(userId);
    if (!userPointer) {
        userPointer = document.createElement("div");
        userPointer.id = userId;
        userPointer.classList.add("pointer");
        userPointer.style.backgroundColor = "white";
        document.body.appendChild(userPointer);
    }
    userPointer.style.left = `${position.x}px`;
    userPointer.style.top = `${position.y}px`;
}

function removeBoard() {
    // firestoreRemoveBoard();
    databaseRemoveBoard();
}

// Database functions

function firestoreChalkboardListener() {
    chalkBoardCollection = firestore.collection("chalkboard");

    chalkBoardCollection.where("deleted", "==", false).onSnapshot(
        function (snapshot) {
            clearBoard();
            snapshot.forEach(
                function (change) {
                    var data = change.data();
                    chalkIds.push(change.id);
                    drawChalk(data.points, data.colour);
                }
            );
        }
    );
}

function firestoreUploadChalk(points, colour) {
    const chalk = {points: points, colour: colour, user: user, deleted: false};
    chalkBoardCollection.doc().set(chalk, {merge: true});
}

function firestoreUserListener() {
    const position = {x: 0, y: 0};
    userCollection = firestore.collection("users");
    userCollection.doc(user).set({user: user, colour: chalkStyle, position: position}, {merge: true});

    userCollection.onSnapshot(
        function (snapshot) {
            snapshot.forEach(
                function (change) {
                    var data = change.data();
                    drawUser(data.user, data.position, data.colour);
                }
            );
        }
    );
}

function firestoreUploadUser(user, x, y) {
    const userData = {user: user, position: {x: x, y: y}, colour: chalkStyle};
    userCollection.doc(user).set(userData, {merge: true});
}

function firestoreRemoveBoard() {
    chalkIds.forEach(
        function(chalkId) {
            chalkBoardCollection.doc(chalkId).delete();
        }
    );
    chalkIds = [];
}

function databaseChalkboardListener() {
    database.ref("chalkboard").on(
        "value", function (snapshot) {
            clearBoard();
            var data = snapshot.val();
            for (var key in data) {
                chalkIds.push(key);
                drawChalk(data[key].points, data[key].colour);
            }
        }
    );
}

function databaseUploadChalk(points, colour) {
    const chalk = {points: points, colour: colour};
    database.ref("chalkboard/" + user + "-" + chalkId).set(chalk);
}

function databaseUserListener() {
    const position = {x: 0, y: 0};
    database.ref("users/" + user).set({user: user, colour: chalkStyle, position: position});

    database.ref("users").on(
        "value", function (snapshot) {
            var data = snapshot.val();
            for (var key in data) {
                drawUser(key, data[key].position, data[key].colour);
            }
        }
    );
}

function databaseUploadUser(user, x, y) {
    const userData = {user: user, position: {x: x, y: y}, colour: chalkStyle};
    database.ref("users/" + user).set(userData);
}

function databaseRemoveBoard() {
    database.ref("chalkboard").remove();
    chalkId = 0;
    chalkIds = [];
}
