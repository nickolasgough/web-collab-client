var chalkboard = null;
var context = null;
var client = null;
var modeSpan = null;

var firestore = null;

var isTracing = false;
var mode = "chalk";

const chalkStyle = "white";
const chalkRadius = 3;
const brushStyle = "black";
const brushRadius = 30;

function initialLoad() {
    chalkboard = document.getElementById("chalkboard");
    context = chalkboard.getContext("2d");
    client = chalkboard.getBoundingClientRect();

    modeSpan = document.getElementById("mode");
    modeSpan.innerHTML = mode;

    firestore = firebase.firestore();
    firestore.collection("chalkboard").get().then(
        function(chalkboardSnapshot) {
            chalkboardSnapshot.forEach(
                function(chalk) {
                    const data = chalk.data();
                    drawChalk(data.x, data.y, data.colour, chalkRadius);
                }
            );
        }
    );
}

function changeMode(newMode) {
    mode = newMode;
    modeSpan.innerHTML = mode;
}

function setTrace(newTrace) {
    isTracing = newTrace;
}

function traceBoard(event) {
    if (!isTracing) {
        return;
    }

    var radius = 0;
    switch(mode) {
        case "brush":
            context.fillStyle = brushStyle;
            radius = brushRadius;
            break;
        default:
            context.fillStyle = chalkStyle;
            radius = chalkRadius;
    }
    const mouseX = event.clientX - client.left;
    const mouseY = event.clientY - client.top;
    drawChalk(mouseX, mouseY, context.fillStyle, radius);
}

function drawChalk(x, y, colour, radius) {
    const fillStyle = context.fillStyle;
    context.fillStyle = colour;
    context.beginPath();
    context.arc(x, y, radius, 0, 2*Math.PI);
    context.fill();
    context.stroke();
    context.closePath();
    context.fillStyle = fillStyle;
}

function clearBoard() {
    const fillStyle = context.fillStyle;
    context.fillStyle = brushStyle;
    context.fillRect(0, 0, chalkboard.width, chalkboard.height);
    context.fillStyle = fillStyle;
}
