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
    client = chalkboard.getBoundingClientRect();

    firestore = firebase.firestore();
    firestore.collection("chalkboard").where("deleted", "==", false).onSnapshot(
        function(chalkboardSnapshot) {
            clearBoard();
            chalkIds = [];
            chalkboardSnapshot.forEach(
                function(chalk) {
                    chalkIds.push(chalk.id);
                    const data = chalk.data();
                    drawChalk(data.points, data.colour);
                    nextId += 1;
                }
            );
        }
    );
}

function login() {
    user = document.getElementById("user").value;
    chalkStyle = document.getElementById("colour").value;
    firestore.collection("users").doc(user).set({user: user, colour: chalkStyle}, {merge: true});
}

function setTrace(newTrace, event) {
    if (!user || !chalkStyle) {
        window.alert("Please enter a username and colour to begin drawing.");
        return;
    }

    isTracing = newTrace;
    if (isTracing) {
        const mouseX = event.clientX - client.left;
        const mouseY = event.clientY - client.top;
        currentPoints.push({x: mouseX, y: mouseY});
    } else {
        uploadChalk(currentPoints, chalkStyle);
        currentPoints = [];
    }
}

function traceBoard(event) {
    if (!isTracing) {
        return;
    }

    const mouseX = event.clientX - client.left;
    const mouseY = event.clientY - client.top;
    currentPoints.push({x: mouseX, y: mouseY});
    const count = currentPoints.length;
    drawLine(currentPoints[count-2], currentPoints[count-1], chalkStyle);
}

function uploadChalk(points, colour) {
    const chalkId = `chalk-${nextId}`;
    const chalk = {points: points, colour: colour, user: user, deleted: false};
    firestore.collection("chalkboard").doc(chalkId).set(chalk);
    chalkIds.push(chalkId);
    nextId += 1;
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
    clearBoard();

    chalkIds.forEach(
        function(chalkId) {
            firestore.collection("chalkboard").doc(chalkId).delete();
        }
    );
    chalkIds = [];
    nextId = 0;
}
