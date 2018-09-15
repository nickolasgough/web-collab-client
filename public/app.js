var chalkboard = null;
var context = null;
var client = null;
var modeSpan = null;

var firestore = null;
var chalkIds = [];
var nextId = 0;

var isTracing = false;

const chalkStyle = "white";
const boardStyle = "black";
const chalkRadius = 3;

function initialLoad() {
    chalkboard = document.getElementById("chalkboard");
    context = chalkboard.getContext("2d");
    client = chalkboard.getBoundingClientRect();

    firestore = firebase.firestore();
    firestore.collection("chalkboard").where("deleted", "==", false).onSnapshot(
        function(chalkboardSnapshot) {
            chalkboardSnapshot.forEach(
                function(chalk) {
                    chalkIds.push(chalk.id);
                    const data = chalk.data();
                    drawChalk(data.x, data.y, data.colour);
                    nextId += 1;
                }
            );
        }
    );
}

function setTrace(newTrace) {
    isTracing = newTrace;
}

function traceBoard(event) {
    if (!isTracing) {
        return;
    }

    const mouseX = event.clientX - client.left;
    const mouseY = event.clientY - client.top;
    uploadChalk(mouseX, mouseY, chalkStyle);
}

function uploadChalk(x, y, colour) {
    const chalk = {x: x, y: y, colour: colour, deleted: false};
    firestore.collection("chalkboard").doc(`chalk-${nextId}`).set(chalk);
    nextId += 1;
}

function drawChalk(x, y, colour) {
    const fillStyle = context.fillStyle;
    context.fillStyle = colour;
    context.beginPath();
    context.arc(x, y, chalkRadius, 0, 2*Math.PI);
    context.fill();
    context.stroke();
    context.closePath();
    context.fillStyle = fillStyle;
}

function clearBoard() {
    const fillStyle = context.fillStyle;
    context.fillStyle = boardStyle;
    context.fillRect(0, 0, chalkboard.width, chalkboard.height);
    context.fillStyle = fillStyle;

    chalkIds.forEach(
        function(chalkId) {
            firestore.collection("chalkboard").doc(chalkId).update(
                {deleted: true}
            );
        }
    );
    chalkIds = [];
}
