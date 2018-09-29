var chalkboard = null;
var context = null;
var client = null;
var currentPoints = [];

var firestore = null;
var user;
var chalkIds = [];
var nextId = 0;

var isTracing = false;

var chalkStyle = null;
const boardStyle = "black";

function initialLoad() {
    chalkboard = document.getElementById("chalkboard");
    context = chalkboard.getContext("2d");

    firestore = firebase.firestore();
    firestore.collection("chalkboard").where("deleted", "==", false).onSnapshot(
        function (chalkboardSnapshot) {
            chalkboardSnapshot.docChanges().forEach(
                function (change) {
                    var data = change.doc.data();
                    chalkIds.push(change.doc.id);
                    var docId = parseInt(change.doc.id.split("-")[1]);
                    nextId = docId > nextId ? docId : nextId;
                    if (change.type === "added" || change.type === "modified") {
                        drawChalk(data.points, data.colour);
                    }
                    if (change.type === "removed") {
                        drawChalk(data.points, boardStyle);
                    }
                }
            );
        }
    );
}

function login() {
    user = document.getElementById("user").value;
    chalkStyle = document.getElementById("colour").value;
    firestore.collection("users").doc(user).set({user: user, colour: chalkStyle}, {merge: true});

    firestore.collection("users").onSnapshot(
        function (usersSnapshot) {
            usersSnapshot.docChanges().forEach(
                function (change) {
                    var data = change.doc.data();
                    if (change.type === "added") {
                        drawUser(data.user, data.position, data.colour);
                    }
                    if (change.type === "modified") {
                        drawUser(data.user, data.position, data.colour);
                    }
                    if (change.type === "removed") {
                        removeUser(data.user);
                    }
                }
            );
        }
    );
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

    nextId = !isTracing ? nextId + 1 : nextId;
    currentPoints = !isTracing ? [] : currentPoints;
}

function traceBoard(event) {
    if (user) {
        const userData = {user: user, position: {x: event.clientX, y: event.clientY}, colour: chalkStyle};
        firestore.collection("users").doc(user).set(userData, {merge: true});
    }
    if (!isTracing) {
        return;
    }

    client = chalkboard.getBoundingClientRect();
    const mouseX = event.clientX - client.left;
    const mouseY = event.clientY - client.top;
    currentPoints.push({x: mouseX, y: mouseY});
    uploadChalk(currentPoints, chalkStyle);
}

function uploadChalk(points, colour) {
    const chalkId = `chalk-${nextId}`;
    const chalk = {points: points, colour: colour, user: user, deleted: false};
    firestore.collection("chalkboard").doc(chalkId).set(chalk, {merge: true});
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

function removeBoard() {
    chalkIds.forEach(
        function(chalkId) {
            firestore.collection("chalkboard").doc(chalkId).delete();
        }
    );
    chalkIds = [];
    nextId = 0;
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
